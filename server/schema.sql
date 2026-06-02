
CREATE DATABASE IF NOT EXISTS surgical_training;
USE surgical_training;

CREATE TABLE IF NOT EXISTS TRAINEES (
  TraineeID INT PRIMARY KEY AUTO_INCREMENT,
  Name VARCHAR(100) NOT NULL,
  Email VARCHAR(100) UNIQUE NOT NULL,
  Password VARCHAR(255) NOT NULL,
  Progress REAL DEFAULT 0,
  Specialty VARCHAR(100) DEFAULT NULL,
  PriorSimulationExperience VARCHAR(50) DEFAULT NULL,
  UnityUnrealExperience VARCHAR(50) DEFAULT NULL,
  Role VARCHAR(20) DEFAULT 'trainee'
);

CREATE TABLE IF NOT EXISTS COURSES (
  CourseID INT PRIMARY KEY AUTO_INCREMENT,
  CourseName VARCHAR(100) NOT NULL,
  CourseLevel VARCHAR(50),
  Type VARCHAR(10) NOT NULL,
  Duration INT
);

CREATE TABLE IF NOT EXISTS SESSIONS (
  SessionID INT PRIMARY KEY AUTO_INCREMENT,
  TraineeID INT NOT NULL,
  CourseID INT NOT NULL,
  Difficulty VARCHAR(20) DEFAULT 'intermediate',
  Date DATE NOT NULL,
  StartTime TIME,
  EndTime TIME,
  FOREIGN KEY (TraineeID) REFERENCES TRAINEES(TraineeID),
  FOREIGN KEY (CourseID) REFERENCES COURSES(CourseID)
);

CREATE TABLE IF NOT EXISTS REPORTS (
  ReportID INT PRIMARY KEY AUTO_INCREMENT,
  SessionID INT UNIQUE NOT NULL,
  TotalScore REAL,
  AccuracyScore REAL,
  SpeedScore REAL,
  StepsCompleted INT,
  TotalSteps INT,
  DurationSeconds INT,
  Comments TEXT,
  FOREIGN KEY (SessionID) REFERENCES SESSIONS(SessionID)
);

CREATE INDEX idx_sessions_trainee ON SESSIONS(TraineeID);
CREATE INDEX idx_sessions_date ON SESSIONS(Date);
CREATE INDEX idx_reports_session ON REPORTS(SessionID);
CREATE INDEX idx_trainees_email ON TRAINEES(Email);

INSERT IGNORE INTO COURSES (CourseID, CourseName, CourseLevel, Type, Duration) VALUES
(1, 'خياطة الجرح - أساسيات', 'مبتدئ', 'VR', 15);

-- Default instructor: instructor@example.com / instructor123
INSERT IGNORE INTO TRAINEES (Name, Email, Password, Role) VALUES
('Instructor', 'instructor@example.com', 'instructor123', 'instructor');
