import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3001,
  jwt: {
    /** Required in production; dev fallback only for local testing */
    secret: process.env.JWT_SECRET || 'dev-only-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'surgical_training',
  },
};
