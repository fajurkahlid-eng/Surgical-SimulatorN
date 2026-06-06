import Database from 'better-sqlite3';
import { config } from './config.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, config.sqlite.path);

let db = null;

export async function getPool() {
  if (!db) {
    db = new Database(dbPath);
    // تفعيل المفاتيح الأجنبية
    db.pragma('foreign_keys = ON');
    // تحسين الأداء
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export async function query(sql, params = []) {
  const database = await getPool();
  
  // تحديد نوع الاستعلام (SELECT أو غيره)
  const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
  const stmt = database.prepare(sql);

  if (isSelect) {
    // للـ SELECT نعود مصفوفة الصفوف
    return stmt.all(params);
  } else {
    // للـ INSERT/UPDATE/DELETE نعود كائن النتيجة
    return stmt.run(params);
  }
}
