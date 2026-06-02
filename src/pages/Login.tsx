import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, mapTraineeToUser } from '../context/AuthContext';
import { useDb } from '../context/DbContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';
import { validateEmail, validatePassword, validateRequired } from '../utils/validation';

export default function Login(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [priorSimulationExperience, setPriorSimulationExperience] = useState('');
  const [unityUnrealExperience, setUnityUnrealExperience] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { ready } = useDb();
  const { t } = useLang();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');
    if (!ready) {
      setError(String(t('login.errorLoading')));
      return;
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(String(t(emailCheck.messageKey ?? 'validation.required')));
      return;
    }
    const passwordCheck = validatePassword(password, isRegister);
    if (!passwordCheck.valid) {
      setError(String(t(passwordCheck.messageKey ?? 'validation.required')));
      return;
    }
    if (isRegister) {
      const nameCheck = validateRequired(name);
      if (!nameCheck.valid) {
        setError(String(t('login.errorFillAll')));
        return;
      }
      setLoading(true);
      try {
        const exists = await api.checkEmailExists(email.trim());
        if (exists) {
          setError(String(t('login.errorEmailExists')));
          return;
        }
        const { token, user: row } = await api.register(name.trim(), email.trim(), password, {
          specialty: specialty.trim() || undefined,
          priorSimulationExperience: priorSimulationExperience.trim() || undefined,
          unityUnrealExperience: unityUnrealExperience.trim() || undefined,
        });
        login(mapTraineeToUser(row), token);
        navigate(row.Role === 'instructor' ? '/instructor-dashboard' : '/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed');
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const { token, user: row } = await api.login(email.trim(), password);
      login(mapTraineeToUser(row), token);
      navigate(row.Role === 'instructor' ? '/instructor-dashboard' : '/dashboard');
    } catch (err) {
      setError(String(t('login.errorInvalidCreds')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-teal-950 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-teal-900/90 border border-teal-700 rounded-2xl shadow-xl p-5 sm:p-8">
        <p className="text-teal-500 text-xs text-center mb-2">{String(t('login.brand'))}</p>
        <h1 className="text-2xl font-bold text-teal-100 mb-2 text-center">{String(t('login.title'))}</h1>
        <p className="text-teal-400 text-sm text-center mb-6">{String(t('login.subtitle'))}</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isRegister && (
            <>
              <div>
                <label className="block text-teal-300 text-sm mb-1">{String(t('login.name'))}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-teal-800 border border-teal-600 rounded-xl text-teal-100 placeholder-teal-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder={String(t('login.namePlaceholder'))}
                />
              </div>
              <div>
                <label className="block text-teal-300 text-sm mb-1">{String(t('login.specialty'))}</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-4 py-3 bg-teal-800 border border-teal-600 rounded-xl text-teal-100 placeholder-teal-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder={String(t('login.specialtyPlaceholder'))}
                />
              </div>
              <div>
                <label className="block text-teal-300 text-sm mb-1">{String(t('login.priorSimulation'))}</label>
                <select
                  value={priorSimulationExperience}
                  onChange={(e) => setPriorSimulationExperience(e.target.value)}
                  className="w-full px-4 py-3 bg-teal-800 border border-teal-600 rounded-xl text-teal-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">{String(t('login.priorSimulationPlaceholder'))}</option>
                  <option value="none">{String(t('login.priorNone'))}</option>
                  <option value="basic">{String(t('login.priorBasic'))}</option>
                  <option value="intermediate">{String(t('login.priorIntermediate'))}</option>
                  <option value="advanced">{String(t('login.priorAdvanced'))}</option>
                </select>
              </div>
              <div>
                <label className="block text-teal-300 text-sm mb-1">{String(t('login.unityUnreal'))}</label>
                <select
                  value={unityUnrealExperience}
                  onChange={(e) => setUnityUnrealExperience(e.target.value)}
                  className="w-full px-4 py-3 bg-teal-800 border border-teal-600 rounded-xl text-teal-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">{String(t('login.unityUnrealPlaceholder'))}</option>
                  <option value="none">{String(t('login.priorNone'))}</option>
                  <option value="basic">{String(t('login.priorBasic'))}</option>
                  <option value="intermediate">{String(t('login.priorIntermediate'))}</option>
                  <option value="advanced">{String(t('login.priorAdvanced'))}</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-teal-300 text-sm mb-1">{String(t('login.email'))}</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-teal-800 border border-teal-600 rounded-xl text-teal-100 placeholder-teal-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder={String(t('login.emailPlaceholder'))}
              required
            />
          </div>
          <div>
            <label className="block text-teal-300 text-sm mb-1">{String(t('login.password'))}</label>
            <div className="relative flex">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pe-24 bg-teal-800 border border-teal-600 rounded-xl text-teal-100 placeholder-teal-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder={String(t('login.passwordPlaceholder'))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-teal-400 hover:text-teal-200 text-xs font-medium"
              >
                {showPassword ? String(t('login.hidePassword')) : String(t('login.showPassword'))}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-70 text-teal-950 font-semibold rounded-xl transition"
          >
            {loading ? '...' : String(isRegister ? t('login.submitRegister') : t('login.submit'))}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setIsRegister((v) => !v); setError(''); }}
          className="w-full mt-4 text-teal-400 hover:text-teal-300 text-sm"
        >
          {String(isRegister ? t('login.switchToLogin') : t('login.switchToRegister'))}
        </button>

        <p className="mt-6 text-center flex flex-wrap justify-center gap-2">
          <Link to="/" className="text-teal-500 hover:text-teal-400">{String(t('login.linkHome'))}</Link>
          <span className="text-teal-600">|</span>
          <Link to="/overview" className="text-teal-500 hover:text-teal-400">{String(t('login.linkOverview'))}</Link>
        </p>
      </div>
    </div>
  );
}
