const dotenv = require('dotenv');

dotenv.config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const fs = require("fs");

// Core service
const { BaseError, ErrorType } = require('./src/core/error');
const { ResponseFactory } = require('./src/core/response');
const Logger = require('./src/core/logger');
const Database = require('./src/core/database');
const Redis = require('./src/core/redis');
const Analyxer = require('./src/core/bktraffic-analyxer');

// 3rd Service
const Facebook = require('./src/core/facebook');
const MailSender = require('./src/core/mail-manager');
const Firebase = require('./src/core/firebase');

const AuthMiddlware = require('./src/middlewares/auth');
const appState = require('./src/state');
const initializeServer = require('./initialize');
const AdminModule = require('./src/modules/admin');
const PaymentModule = require('./src/modules/payment');
const DealModule = require('./src/modules/deal');
const VoucherModule = require('./src/modules/voucher');
const PeriodModule = require('./src/modules/period');
const UserModule = require('./src/modules/user');
const MapModule = require('./src/modules/map');
const FileModule = require('./src/modules/file');
const ReportModule = require('./src/modules/report');
const ReferenceModule = require('./src/modules/reference');
const TrafficStatusModule = require('./src/modules/traffic-status');
const EvaluationModule = require('./src/modules/evaluation');
const NotificationModule = require('./src/modules/notification');
const VohModule = require('./src/modules/voh');
const locationHistory = require('./src/modules/location-history');
const trafficStatusCache = require('./src/modules/traffic-status/traffic-status.cache');
const periodService = require('./src/modules/period/period.service');
const DistanceModule = require('./src/modules/distance');
const AppVersionModule = require('./src/modules/app-version');
const FeedbackModule = require('./src/modules/feedback');
const GiftModule = require('./src/modules/gift');
const AdminUtrafficModule = require('./src/modules/admin-utraffic');
const PublicDataModule = require('./src/modules/public-data');
const HealthFacilityModule = require("./src/modules/health-facility");
const AtmModule = require("./src/modules/atm");
const setting = require('./src/config/setting');

const app = express();

app.use(cors());
initializeServer();

app.use('/public', express.static(path.join(__dirname, './public')));

if (!fs.existsSync('tmp')){
  fs.mkdirSync('tmp');
}

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: Logger.customStream }));
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function syncStateWithDatabase() {
  try {
    const result = await ReferenceModule.Service.findMany({});
    result.forEach((ref) => {
      if (ref.group === appState.lastUpdateStatusTimeRefKey) {
        // appState.lastUpdateStatusTime = parseFloat(ref.value);
      } else if (ref.group === appState.updateStatusIntervalRefKey) {
        appState.updateStatusInterval = parseFloat(ref.value);
        NotificationModule.Service.setNotiInterval(
          appState.updateStatusInterval,
        );
      }
    });

    Logger.info('Sync state with database success');
  } catch (error) {
    Logger.error('Sync state error %o', error);
  }
}

Database.init(async (err) => {
  if (err) {
    Logger.error('Connect database failure!');
    Logger.error(err);
  } else {
    Logger.info('Connect database successfully!');
    syncStateWithDatabase();
    NotificationModule.Service.init(appState.updateStatusInterval);
    await MapModule.Service.init();
    await PeriodModule.Service.init();
    await trafficStatusCache.sync();
    const period = await periodService.getCurrentPeriod();
    setting.currentPeriod = period;
  }
});

Firebase.init();
Facebook.init();
AuthMiddlware.init();
MailSender.init();
Redis.init();
Analyxer.velocityEstimator.init();

app.set('views', './src/html-templates');
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.use('/admin', express.static('./public'));
app.use('/admin', express.static('./node_modules/admin-lte'));
app.use('/admin', AdminModule.Router);
app.use('/api', DealModule.Router);
app.use('/api', VoucherModule.Router);
app.use('/api', UserModule.Router);
app.use('/api', MapModule.Router);
app.use('/api', FileModule.Router);
app.use('/api', ReportModule.Router);
app.use('/api', ReferenceModule.Router);
app.use('/api', TrafficStatusModule.Router);
app.use('/api', EvaluationModule.Router);
app.use('/api', NotificationModule.Router);
app.use('/api', VohModule.Router);
app.use('/api', locationHistory.Router);
app.use('/api', DistanceModule.Router);
app.use('/api', PaymentModule.Router);
app.use('/api', AppVersionModule.Router);
app.use('/api', FeedbackModule.Router);
app.use('/api', GiftModule.Router);
app.use('/api', AdminUtrafficModule.Router);
app.use('/api', PublicDataModule.Router);
app.use("/api", HealthFacilityModule.Router);
app.use("/api", AtmModule.Router);

app.post('/api/hook/sync-traffic-status', async (req, res) => {
  Logger.info('Received notification');
  res.status(200).send();
  trafficStatusCache
    .sync()
    .then(async () => {
      const period = await periodService.getCurrentPeriod();
      setting.currentPeriod = period;
    })
    .catch(async () => {
      const period = await periodService.getCurrentPeriod();
      setting.currentPeriod = period;
    });
});

app.use('*', (req, res) => {
  new BaseError(ErrorType.notFound).send(res);
});

app.use((err, req, res) => {
  if (err instanceof BaseError) {
    Logger.error('%o', err);
    if (process.env.NODE_ENV === 'production') {
      delete err.debugError;
    }
    err.send(res);
  } else if (err instanceof Error) {
    const message = {

      message: err.message, stack: err.stack,
    };
    Logger.error('%o', message);
    const data = process.env.NODE_ENV !== 'production' ? message : {};
    ResponseFactory.error(
      ErrorType.internalServerError.code,
      ErrorType.internalServerError.message,
      data,
    ).send(res);
  } else {
    Logger.error('%o', err);
    ResponseFactory.error(
      ErrorType.internalServerError.code,
      ErrorType.internalServerError.message,
    ).send(res);
  }
});

/* Cron job */
// Update distances every hour
cron.schedule('0 * * * *', async () => {
  Logger.info('Update distances every hour');
  await DistanceModule.Service.updateDistance();
});

cron.schedule('*/5 * * * *', async () => {
  Logger.info('Update main traffic status every 5 minutes');
  await TrafficStatusModule.Service.updateMainTrafficStatus();
});

// Update point every 1 hour
cron.schedule('0 * * * *', async () => {
  Logger.info('Update point every 1 hour');
  await UserModule.Service.User.updatePointFromDistance();
});

cron.schedule('00 55 23 * * 0-7', async () => {
  Logger.info('log all point receive at 23h59');
  await UserModule.Service.User.updatePointTime();
});

// cache los every 30 minutes
cron.schedule('*/30 * * * *', async () => Analyxer.velocityEstimator.cache(1).catch(() => {
  Logger.error('[Estimator] Periodically cache failed');
}), { scheduled: true, timezone: 'Asia/Bangkok' });

// run every 15 minutes from 6 through 9.
cron.schedule('*/15 6-9 * * *', async () => {
  Logger.info('Add traffic status from VOH (6-9h)');
  await VohModule.Service.addTrafficStatusFromVoh();
}, { scheduled: true, timezone: 'Asia/Bangkok' });

// run at minute 30 past every hour from 9 through 16.
cron.schedule('30 9-16 * * *', async () => {
  Logger.info('Add traffic status from VOH (9-16h)');
  await VohModule.Service.addTrafficStatusFromVoh();
}, { scheduled: true, timezone: 'Asia/Bangkok' });

// run every 15 minutes from 16 through 19.
cron.schedule('*/15 16-19 * * *', async () => {
  Logger.info('Add traffic status from VOH (16-19h)');
  await VohModule.Service.addTrafficStatusFromVoh();
}, { scheduled: true, timezone: 'Asia/Bangkok' });

module.exports = app;
