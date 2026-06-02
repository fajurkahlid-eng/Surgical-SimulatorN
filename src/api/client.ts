const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:3001');

export const ACCESS_TOKEN_KEY = 'surgical_training_access_token';
const USER_STORAGE_KEY = 'surgical_training_user';

/** Clear token + profile (e.g. 401 from API). */
export function clearAuthStorage(): void {
  setAccessToken(null);
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function authHeaders(): Record<string, string> {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  if (
    res.status === 401 &&
    path.startsWith('/api/') &&
    !path.startsWith('/api/auth/login') &&
    !path.startsWith('/api/auth/register') &&
    path !== '/api/health'
  ) {
    clearAuthStorage();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }
  return res;
}

export interface Trainee {
  TraineeID: number;
  Name: string;
  Email: string;
  Specialty?: string | null;
  PriorSimulationExperience?: string | null;
  UnityUnrealExperience?: string | null;
  Role?: 'trainee' | 'instructor';
}

export interface ReportRow {
  ReportID: number;
  SessionID: number;
  TotalScore: number | null;
  AccuracyScore: number | null;
  SpeedScore: number | null;
  StepsCompleted: number | null;
  TotalSteps: number | null;
  DurationSeconds: number | null;
  Comments: string | null;
  Date: string;
  StartTime: string;
  CourseName: string;
  Type: string;
}

export interface DashboardStats {
  sessions: number;
  avgAccuracy: number;
  lastSession: { date: string; accuracy: number | null; duration: number | null } | null;
  chartData: { AccuracyScore: number | null; DurationSeconds: number | null; Date: string }[];
}

function parseAuthResponse(data: Trainee & { token?: string }): { token: string; user: Trainee } {
  const { token, ...rest } = data as Trainee & { token: string };
  if (!token) throw new Error('Missing token in response');
  return { token, user: rest as Trainee };
}

export const api = {
  async register(
    name: string,
    email: string,
    password: string,
    opts?: { specialty?: string; priorSimulationExperience?: string; unityUnrealExperience?: string }
  ): Promise<{ token: string; user: Trainee }> {
    const res = await fetchApi('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        specialty: opts?.specialty,
        priorSimulationExperience: opts?.priorSimulationExperience,
        unityUnrealExperience: opts?.unityUnrealExperience,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || 'Registration failed');
    }
    const data = (await res.json()) as Trainee & { token?: string };
    return parseAuthResponse(data);
  },

  async login(email: string, password: string): Promise<{ token: string; user: Trainee }> {
    const res = await fetchApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || 'Invalid credentials');
    }
    const data = (await res.json()) as Trainee & { token?: string };
    return parseAuthResponse(data);
  },

  async getMe(): Promise<Trainee> {
    const res = await fetchApi('/api/auth/me', { method: 'GET' });
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const res = await fetchApi(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    return data.exists === true;
  },

  async createSession(
    courseId = 1,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<{ sessionId: number }> {
    const res = await fetchApi('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ courseId, difficulty }),
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async endSession(sessionId: number): Promise<void> {
    const res = await fetchApi(`/api/sessions/${sessionId}/end`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to end session');
  },

  async createReport(data: {
    sessionId: number;
    totalScore?: number;
    accuracyScore?: number;
    speedScore?: number;
    stepsCompleted?: number;
    totalSteps?: number;
    durationSeconds?: number;
    comments?: string | null;
  }): Promise<void> {
    const res = await fetchApi('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create report');
  },

  async getStats(traineeId: number): Promise<DashboardStats> {
    const res = await fetchApi(`/api/stats/${traineeId}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getReports(traineeId: number): Promise<ReportRow[]> {
    const res = await fetchApi(`/api/reports/${traineeId}`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async getAdminTrainees(): Promise<
    {
      TraineeID: number;
      Name: string;
      Email: string;
      Specialty: string | null;
      PriorSimulationExperience: string | null;
      UnityUnrealExperience: string | null;
      Progress: number;
    }[]
  > {
    const res = await fetchApi('/api/admin/trainees');
    if (!res.ok) throw new Error('Failed to fetch trainees');
    return res.json();
  },

  async getAdminReports(): Promise<(ReportRow & { TraineeID: number; TraineeName: string; TraineeEmail: string })[]> {
    const res = await fetchApi('/api/admin/reports');
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async health(): Promise<boolean> {
    try {
      const res = await fetchApi('/api/health');
      return res.ok;
    } catch {
      return false;
    }
  },
};
