import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3001,
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  // في Render، يفضل استخدام مسار ثابت داخل Disk (مثل /data/db.sqlite)
  // محلياً سيتم إنشاء الملف في مجلد المشروع
  sqlite: {
    path: process.env.SQLITE_DB_PATH || './surgical_training.db',
  },
};
