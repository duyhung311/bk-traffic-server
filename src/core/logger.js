const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const { format, transports } = winston;

const Logger = winston.createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: { service: 'bk-traffic' },
  transports: [
    new DailyRotateFile({
      filename: 'bktraffic-%DATE%.log',
      maxSize: '20m',
      maxFiles: '30d',
      dirname: 'logs',
    }),
    new DailyRotateFile({
      level: 'error',
      filename: 'bktraffic-%DATE%.log',
      maxSize: '20m',
      maxFiles: '20d',
      dirname: 'logs/errors',
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  Logger.add(
    new transports.Console({
      format: format.combine(format.json(), format.colorize(), format.simple()),
    }),
  );
}

Logger.customStream = {
  write: (message) => {
    Logger.info(message);
  },
};

module.exports = Logger;
