const database = require('../../core/database');
const modelNames = require('../../config/model-names');
const segmentStatus = require('../traffic-status');
const { BaseError, ErrorType } = require('../../core/error');
const Logger = require('../../core/logger');
const utils = require('../../core/utils');
const firebase = require('../../core/firebase');
const periodModule = require('../period');

function findOne(query, populate) {
  return database.findOne(modelNames.notification, query, populate);
}

function findMany(query, populate) {
  return database.findMany(modelNames.notification, query, null, null, null, populate);
}

function insertOne(data) {
  return database.create(modelNames.notification, data);
}

function insertOrUpdateOne(query, data) {
  return database.updateOneOrCreate(modelNames.notification,
    query,
    data);
}

function updateOne(query, data) {
  return database.updateOne(modelNames.notification,
    query,
    data);
}

async function notifyToUser() {
  try {
    const lastPeriod = await periodModule.Service.getLastUpdatedPeriod();
    const currentPeriod = await periodModule.Service.getCurrentPeriod();

    if (!lastPeriod || !currentPeriod) {
      Logger.error('Periods error');
      return;
    }
    const periodIds = [currentPeriod._id];
    if (lastPeriod) {
      periodIds.push(lastPeriod._id);
    }
    const activeDevices = await findMany({
      active: true,
      period: { $in: periodIds },
    }, 'path');
    Logger.info('Found %d active devices', activeDevices.length);

    const updatedSegments = await segmentStatus.Service.findMany({
      period_id: lastPeriod._id,
    });
    Logger.info('Found %d updated segment', updatedSegments.length);
    const updatedSegmentIds = {};
    Logger.info(updatedSegments);
    updatedSegments.forEach((item) => {
      updatedSegmentIds[item.segment] = item;
    });
    for (let i = 0; i < activeDevices.length; i += 1) {
      const device = activeDevices[i];
      const badSegments = [];
      if (device.path && device.path.segments) {
        let currentLocationIndex = -1;
        for (let j = 0; j < device.path.segments.length; j += 1) {
          const seg = device.path.segments[j];
          Logger.info('Seg', seg._id, 'device', device.segment, currentLocationIndex);
          if (seg._id === device.segment) {
            currentLocationIndex = j;
          } else if (currentLocationIndex < 0) {
            // todo nothing
          } else {
            // check update status for segment
            Logger.info('Segment status', updatedSegmentIds[seg._id]);
            if (updatedSegmentIds[seg._id] && updatedSegmentIds[seg._id].velocity < 10) {
              badSegments.push(updatedSegmentIds[seg._id]);
              break;
            }
          }
        }
      } else {
        for (let j = 0; j < updatedSegments.length; j++) {
          const coords = updatedSegments[j].polyline.coordinates;
          const coord1 = {
            lat: device.lat,
            lng: device.lng,
          };
          const coord2 = {
            lat: coords[1],
            lng: coords[0],
          };
          const distance = utils.getDistanceBetweenTwoCoords(coord1, coord2);
          Logger.info(distance);
          if (distance < 20000000 && updatedSegments[j].velocity < 10) {
            badSegments.push(updatedSegments[j]);
            break;
          }
        }
      }

      // notice to device
      // console.log("bad segment", JSON.stringify(badSegments));
      if (badSegments.length > 0) {
        Logger.info('Noti to token', device.token);
        firebase.sendDataNotificationToDevice({
          notiType: device.path ? 'DIRECTION_NOTI_TYPE' : 'REPORT_NOTI_TYPE',
          segments: JSON.stringify(badSegments),
        }, device.token);
      } else {
        // console.log('Dont Notice to path', device.token);
      }
    }
  } catch (err) {
    Logger.info(err);
    throw new BaseError(ErrorType.internalServerError);
  }
}

let oldInterval;
function setNotiInterval(time) {
  Logger.info('Update noti after %dms', time);
  try {
    if (oldInterval) {
      clearInterval(oldInterval);
    }
    oldInterval = setInterval(() => {
      notifyToUser().catch((err) => {
        Logger.info('Noti error', err);
      });
    }, time);
  } catch (error) {
    Logger.error('Notification error %o', error);
  }
}

function init(time) {
  setNotiInterval(time);
}

module.exports = {
  findOne,
  findMany,
  insertOne,
  insertOrUpdateOne,
  updateOne,
  notifyToUser,
  setNotiInterval,
  init,
};
