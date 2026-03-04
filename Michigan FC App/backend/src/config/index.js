const path = require('path');

// Load .env from project root (backend/.env)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isTest: process.env.NODE_ENV === 'test',

  db: {
    server:   process.env.DB_SERVER   || '',
    database: process.env.NODE_ENV === 'test'
      ? (process.env.DB_NAME_TEST || 'MichiganFC_Test')
      : (process.env.DB_NAME      || 'MichiganFC'),
    user:     process.env.DB_USER     || '',
    password: process.env.DB_PASSWORD || '',
    port:     parseInt(process.env.DB_PORT, 10) || 1433,
    options: {
      encrypt: process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: process.env.NODE_ENV !== 'production',
    },
    pool: { max: 20, min: 2, idleTimeoutMillis: 30000 },
  },

  jwt: {
    secret:    process.env.JWT_SECRET    || 'dev-secret-replace-me-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  },

  corsOrigin: process.env.CORS_ORIGIN || '*',
};

module.exports = config;
