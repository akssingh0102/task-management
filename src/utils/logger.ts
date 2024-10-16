import winston from 'winston';
import 'winston-daily-rotate-file';

// Define custom log levels
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
  },
  colors: {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'magenta',
  },
};

const customFormat = winston.format.printf(({ timestamp, level, message }) => {
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return `[${formattedDate}] ${level}: ${message}`;
});

const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/server-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(winston.format.timestamp(), customFormat),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), customFormat),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    transport,
  ],
});

logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);

process.on('unhandledRejection', (ex) => {
  throw ex;
});

winston.addColors(customLevels.colors);

export default logger;
