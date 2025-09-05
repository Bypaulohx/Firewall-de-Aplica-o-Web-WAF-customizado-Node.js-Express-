const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  trustProxy: process.env.TRUST_PROXY === 'true',
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100
  },
  ipBlacklist: (process.env.IP_BLACKLIST || '').split(',').map(s => s.trim()).filter(Boolean),
  ipWhitelist: (process.env.IP_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean),
  maxBodySize: Number(process.env.MAX_BODY_SIZE) || 10 * 1024
};
