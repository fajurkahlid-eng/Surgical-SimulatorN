import mysql from 'mysql2/promise';

let pool = null;

export async function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 28856,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: {
          rejectUnauthorized: false
        }
      });
    } catch (error) {
      console.error("خطأ أثناء إنشاء مجمع اتصالات قاعدة البيانات:", error);
    }
  }
  return pool;
}

export async function query(sql, params = []) {
  try {
    const p = await getPool();
    if (!p) throw new Error("لم يتم تهيئة اتصال قاعدة البيانات بشكل صحيح");
    const [rows] = await p.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("[خطأ في استعلام قاعدة البيانات]:", error);
    throw error;
  }
}
