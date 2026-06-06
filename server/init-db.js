import mysql from 'mysql2/promise';

async function init() {
  // الاتصال باستخدام متغيرات البيئة التي ضبطناها في Render
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true // مهم جداً لتنفيذ عدة أوامر SQL
  });

  console.log('جاري تهيئة قاعدة البيانات...');

  const schema = `
    CREATE TABLE IF NOT EXISTS TRAINEES (
      TraineeID INT AUTO_INCREMENT PRIMARY KEY,
      Name VARCHAR(255) NOT NULL,
      Email VARCHAR(255) UNIQUE NOT NULL,
      Password VARCHAR(255) NOT NULL,
      Progress FLOAT DEFAULT 0,
      Specialty VARCHAR(255),
      PriorSimulationExperience TEXT,
      UnityUnrealExperience TEXT,
      Role VARCHAR(50) DEFAULT 'trainee'
    );

    CREATE TABLE IF NOT EXISTS COURSES (
      CourseID INT AUTO_INCREMENT PRIMARY KEY,
      CourseName VARCHAR(255) NOT NULL,
      CourseLevel VARCHAR(100),
      Type VARCHAR(100) NOT NULL,
      Duration INT
    );

    CREATE TABLE IF NOT EXISTS SESSIONS (
      SessionID INT AUTO_INCREMENT PRIMARY KEY,
      TraineeID INT NOT NULL,
      CourseID INT NOT NULL,
      Difficulty VARCHAR(50) DEFAULT 'intermediate',
      Date VARCHAR(50) NOT NULL,
      StartTime VARCHAR(50),
      EndTime VARCHAR(50),
      FOREIGN KEY (TraineeID) REFERENCES TRAINEES(TraineeID),
      FOREIGN KEY (CourseID) REFERENCES COURSES(CourseID)
    );

    CREATE TABLE IF NOT EXISTS REPORTS (
      ReportID INT AUTO_INCREMENT PRIMARY KEY,
      SessionID INT UNIQUE NOT NULL,
      TotalScore FLOAT,
      AccuracyScore FLOAT,
      SpeedScore FLOAT,
      StepsCompleted INT,
      TotalSteps INT,
      DurationSeconds INT,
      Comments TEXT,
      FOREIGN KEY (SessionID) REFERENCES SESSIONS(SessionID)
    );
  `;

  await connection.query(schema);
  console.log('تم إنشاء جميع الجداول بنجاح في MySQL.');
  await connection.end();
}

init().catch(err => {
  console.error('خطأ أثناء تهيئة قاعدة البيانات:', err);
  process.exit(1);
});
