-- SQLite لا يحتاج لإنشاء قاعدة بيانات، الملف هو القاعدة

CREATE TABLE IF NOT EXISTS TRAINEES (
  TraineeID INTEGER PRIMARY KEY AUTOINCREMENT,
  Name TEXT NOT NULL,
  Email TEXT UNIQUE NOT NULL,
  Password TEXT NOT NULL,
  Progress REAL DEFAULT 0,
  Specialty TEXT DEFAULT NULL,
  PriorSimulationExperience TEXT DEFAULT NULL,
  UnityUnrealExperience TEXT DEFAULT NULL,
  Role TEXT DEFAULT 'trainee'
);

CREATE TABLE IF NOT EXISTS COURSES (
  CourseID INTEGER PRIMARY KEY AUTOINCREMENT,
  CourseName TEXT NOT NULL,
  CourseLevel TEXT,
  Type TEXT NOT NULL,
  Duration INTEGER
);

CREATE TABLE IF NOT EXISTS SESSIONS (
  SessionID INTEGER PRIMARY KEY AUTOINCREMENT,
  TraineeID INTEGER NOT NULL,
  CourseID INTEGER NOT NULL,
  Difficulty TEXT DEFAULT 'intermediate',
  Date TEXT NOT NULL,
  StartTime TEXT,
  EndTime TEXT,
  FOREIGN KEY (TraineeID) REFERENCES TRAINEES(TraineeID),
  FOREIGN KEY (CourseID) REFERENCES COURSES(CourseID)
);

CREATE TABLE IF NOT EXISTS REPORTS (
  ReportID INTEGER PRIMARY KEY AUTOINCREMENT,
  SessionID INTEGER UNIQUE NOT NULL,
  TotalScore REAL,
  AccuracyScore REAL,
  SpeedScore REAL,
  StepsCompleted INTEGER,
  TotalSteps INTEGER,
  DurationSeconds INTEGER,
  Comments TEXT,
  FOREIGN KEY (SessionID) REFERENCES SESSIONS(SessionID)
);

CREATE INDEX IF NOT EXISTS idx_sessions_trainee ON SESSIONS(TraineeID);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON SESSIONS(Date);
CREATE INDEX IF NOT EXISTS idx_reports_session ON REPORTS(SessionID);
CREATE INDEX IF NOT EXISTS idx_trainees_email ON TRAINEES(Email);

-- INSERT OR IGNORE هو بديل INSERT IGNORE في SQLite
INSERT OR IGNORE INTO COURSES (CourseID, CourseName, CourseLevel, Type, Duration) VALUES
(1, 'خياطة الجرح - أساسيات', 'مبتدئ', 'VR', 15);

-- Default instructor: instructor@example.com / instructor123
INSERT OR IGNORE INTO TRAINEES (TraineeID, Name, Email, Password, Role) VALUES
(1, 'Instructor', 'instructor@example.com', 'instructor123', 'instructor');
