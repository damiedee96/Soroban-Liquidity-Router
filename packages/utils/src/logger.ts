import winston from 'winston';

/**
 * Logger configuration for the application
 */

const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';

const formats: winston.Logform.Format[] = [
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
];

if (logFormat === 'json') {
  formats.push(winston.format.json());
} else {
  formats.push(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaString}`;
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(...formats),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test',
    }),
  ],
});

/**
 * Create child logger with context
 */
export function createLogger(context: string) {
  return logger.child({ context });
}

/**
 * Log levels for convenience
 */
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;
