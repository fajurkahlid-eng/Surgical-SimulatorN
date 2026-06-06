import mysql from 'mysql2/promise';

async function init() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  console.log('جاري تهيئة الجداول في MySQL...');

  const schema = `
    CREATE TABLE IF NOT EXISTS TRAINEES (
      TraineeID INT AUTO_INCREMENT PRIMARY KEY,
      Name VARCHAR(255) NOT NULL,
      Email VARCHAR(255) UNIQUE NOT NULL,
      Password VARCHAR(255) NOT NULL,
      Progress FLOAT DEFAULT 0,
      Specialty VARCHAR(255),
      Role VARCHAR(50) DEFAULT 'trainee'
    );
    CREATE TABLE IF NOT EXISTS COURSES (
      CourseID INT AUTO_INCREMENT PRIMARY KEY,
      CourseName VARCHAR(255) NOT NULL,
      Type VARCHAR(100)
    );
  `;

  await connection.query(schema);
  console.log('تم إنشاء الجداول بنجاح.');
  await connection.end();
}
init().catch(console.error);
