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

// Create a custom format to match the desired output format
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

// Transport for rotating logs daily
const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/server-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true, // Compress logs
  maxSize: '20m', // Maximum log size
  maxFiles: '14d', // Keep logs for 14 days
});

// Define logger with environment-based log levels
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(), // Add timestamp to the log
    customFormat // Apply the custom format
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorize the output for console
        customFormat // Apply the custom format for console output
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    transport, // Add rotating file transport
  ],
});

// Handle uncaught exceptions and unhandled promise rejections
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);

process.on('unhandledRejection', (ex) => {
  throw ex; // Let winston handle unhandled rejections
});

// Add color coding for custom levels
winston.addColors(customLevels.colors);

export default logger;
