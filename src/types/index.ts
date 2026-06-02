export interface User {
  traineeId: number;
  name: string;
  email: string;
  role?: 'trainee' | 'instructor';
  specialty?: string | null;
  priorSimulationExperience?: string | null;
  unityUnrealExperience?: string | null;
}

export type Lang = 'ar' | 'en';

export interface SqlJsDatabase {
  run: (sql: string, params?: unknown[]) => void;
  prepare: (sql: string) => {
    bind: (params: unknown[]) => void;
    step: () => boolean;
    getAsObject: () => Record<string, unknown>;
    free: () => void;
  };
  export: () => Uint8Array;
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

export interface ValidationResult {
  valid: boolean;
  messageKey?: string;
}

export interface TeamMember {
  name: string;
  id: string;
}

export interface I18nItem {
  title: string;
  desc?: string;
  name?: string;
  items?: string;
}
