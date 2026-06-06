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

  const sql = `
    CREATE TABLE IF NOT EXISTS TRAINEES (
      TraineeID INT AUTO_INCREMENT PRIMARY KEY,
      Name VARCHAR(255) NOT NULL,
      Email VARCHAR(255) UNIQUE NOT NULL,
      Password VARCHAR(255) NOT NULL
    );
    -- أضف باقي الجداول هنا بنفس الطريقة
  `;

  await connection.query(sql);
  console.log('MySQL Tables created successfully.');
  await connection.end();
}
init().catch(console.error);
