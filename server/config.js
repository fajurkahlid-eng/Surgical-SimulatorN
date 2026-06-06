import 'dotenv/config';

export const config = {
  port: process.env.PORT || 10000, // السيرفر يجب أن يعمل على منفذ 10000 في Render
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-change-in-production',
    expiresIn: '7d',
  },
  // سنعتمد كلياً على المتغيرات التي أدخلتها في إعدادات Render
  mysql: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  },
};
