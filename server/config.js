import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3306,
  jwt: {
    /** Required in production; dev fallback only for local testing */
    secret: process.env.JWT_SECRET || 'dev-only-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mysql: {
    host: process.env.MYSQL_HOST || '193.203.184.246',
    user: process.env.MYSQL_USER || 'u864760987_surgical',
    password: process.env.MYSQL_PASSWORD || 'Surgical_training1',
    database: process.env.MYSQL_DATABASE || 'u864760987_surgical',
  },
};
