import { useLang } from '../context/LangContext';

export default function LangSwitcher(): JSX.Element {
  const { lang, setLang } = useLang();

  return (
    <div className="flex items-center rounded-lg bg-teal-900/60 p-0.5" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLang('ar')}
        className={`min-w-[3.5rem] py-1.5 px-2 rounded-md text-sm transition ${lang === 'ar' ? 'bg-teal-600 text-white font-medium' : 'text-teal-400 hover:text-teal-200'}`}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`min-w-[3.5rem] py-1.5 px-2 rounded-md text-sm transition ${lang === 'en' ? 'bg-teal-600 text-white font-medium' : 'text-teal-400 hover:text-teal-200'}`}
      >
        English
      </button>
    </div>
  );
}
