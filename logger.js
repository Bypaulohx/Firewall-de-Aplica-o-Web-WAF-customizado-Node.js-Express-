const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), myFormat),
  transports: [
    new winston.transports.Console({ format: combine(colorize(), timestamp(), myFormat) }),
    new winston.transports.File({ filename: 'logs/waf.log' })
  ],
  exitOnError: false
});

module.exports = logger;
