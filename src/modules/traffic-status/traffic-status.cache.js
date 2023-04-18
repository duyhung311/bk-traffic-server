/* eslint-disable no-await-in-loop */
const mongoose = require('mongoose');
const Logger = require('../../core/logger');
const modelNames = require('../../config/model-names');

let isConnected = false;
let isLockSync = false;
const hashMapAdmin = {};
const hashMap = {
  /**
   * segment_id: {
   * velocity: 43,
   * source: '',
   * street_type: ''
   * max_capacity: 20,
   * current_path: 0,
   * }
   */
};

const hashMapMainStatus = {
  // velocity: 35,
  // source: 'AD',
  // active_time: 1500,
  // expireAt: 2021-03-09T10:07:45.173+00:00,
  // updatedAt: '2021-03-09T10:07:15.173+00:00'
  // description: 'no description',
};

async function cacheTrafficStatus() {
  try {
    Logger.info('Start sync main traffic status');
    const now = Date.now();
    const trafficModel = mongoose.model(modelNames.trafficStatus);
    const limit = 200;
    const count = await trafficModel.find({expireAt: {$gt: now}}).countDocuments({});
    let page = 1;
    const totalPage = Math.ceil(count / limit);
    while (page <= totalPage) {
      const segmentStatuses = await trafficModel
        .find({expireAt: {$gt: now}})
        .limit(limit)
        .skip((page - 1) * limit);
      page += 1;
      for (const segmentStatus of segmentStatuses) {
        const key = `${segmentStatus.segment_id}_${segmentStatus.source}`;
        if (!hashMapMainStatus[key] || segmentStatus.updatedAt > hashMapMainStatus[key].updatedAt) {
          hashMapMainStatus[key] = {
            velocity: segmentStatus.velocity,
            source: segmentStatus.source,
            description: segmentStatus.description,
            active_time: segmentStatus.active_time,
            expireAt: segmentStatus.expireAt,
            updatedAt: segmentStatus.updatedAt,
          };
        }
      }
    }
    Logger.info(
      'Sync cache main traffic status successfully %d in %d second.',
      Object.keys(hashMapMainStatus).length, (Date.now() - now) / 1000,
    );
  } catch (error) {
    Logger.error('Sync cache main traffic status error %o', error);
  }
}

async function sync() {
  try {
    if (isLockSync) {
      return Promise.resolve(true);
    }
    isLockSync = true;
    Logger.info('Start sync traffic status');
    const now = Date.now();
    const baseStatusModel = mongoose.model(modelNames.baseSegmentStatus);
    // const trafficModel = mongoose.model(modelNames.segmentStatus);
    // const limit = 200;
    // let count = await trafficModel.countDocuments({});
    // let page = 1;
    // let totalPage = Math.ceil(count / limit);
    // const updatedSegmentIdHash = {};
    // while (page <= totalPage) {
    //   const segments = await trafficModel
    //     .find({})
    //     .limit(limit)
    //     .skip((page - 1) * limit);
    //   for (let i = 0; i < segments.length; i++) {
    //     const id = segments[i].segment;
    //     if (!hashMap[id]) {
    //       hashMap[id] = {
    //         velocity: segments[i].velocity,
    //         source: 'user',
    //         street_type: '',
    //         max_capacity: 20,
    //         current_path: 0,
    //       };
    //     } else {
    //       hashMap[id].velocity = segments[i].velocity;
    //       hashMap[id].source = 'user';
    //     }
    //     updatedSegmentIdHash[id] = true;
    //   }
    //   page++;
    // }

    // const query = {
    //   segmentId: { $nin: Object.keys(updatedSegmentIdHash) },
    // };
    const query = {};
    const limit = 200;
    let count = await baseStatusModel.countDocuments(query);
    let page = 1;
    const totalPage = Math.ceil(count / limit);
    // const currentTimestamp = Date.now();
    while (page <= totalPage) {
      const segments = await baseStatusModel
        .find(query)
        .limit(limit)
        .skip((page - 1) * limit);
      count = 0;
      let lastVelocity = 5;
      for (let i = 0; i < segments.length; i += 1) {
        const id = segments[i].segmentId;
        // const period = utils.getBaseStatusFieldOfTime(currentTimestamp);
        // const velocity = utils.getVelocityFromLOS(
        //   segments[i].segmentStatus[period]
        // );
        const { segmentStatus } = segments[i];
        count += 1;
        if (count > 30) {
          count = 0;
          lastVelocity += 5;
          if (lastVelocity > 30) {
            lastVelocity = 5;
          }
        }
        const velocity = lastVelocity;
        // console.log("velocity", id, velocity, 'count', count);
        if (!hashMap[id]) {
          hashMap[id] = {
            velocity,
            source: 'base-data',
            street_type: '',
            max_capacity: 20,
            current_path: 0,
            segmentStatus,
          };
        } else {
          lastVelocity = hashMap[id].velocity;
          hashMap[id].velocity = lastVelocity < velocity
            ? Math.min(lastVelocity + 5, velocity)
            : Math.max(lastVelocity - 5, velocity);
          hashMap[id].source = 'base-data';
        }
      }
      page += 1;
    }
    isConnected = true;
    isLockSync = false;
    Logger.info(
      'Sync cache status successfully %d in %d second.',
      Object.keys(hashMap).length, (Date.now() - now) / 1000,
    );
    return cacheTrafficStatus();
  } catch (error) {
    Logger.error('Sync cache status error %o', error);
    return Promise.resolve(false);
  }
}

function updateHashMapMainStatus(segmentStatus) {
  // Logger.info('Start update admin traffic status %d', segment._id);
  const key = `${segmentStatus.segment_id}_${segmentStatus.source}`;
  hashMapMainStatus[key] = {
    velocity: segmentStatus.velocity,
    source: segmentStatus.source,
    description: segmentStatus.description,
    active_time: segmentStatus.active_time,
    expireAt: segmentStatus.expireAt,
    updatedAt: segmentStatus.updatedAt ? segmentStatus.updatedAt : new Date(),
  };
}

function deleteHashMapAdmin(segmentId) {
  const isDeleted = delete hashMapAdmin[segmentId];
  return isDeleted;
}

function inactiveHashMapAdmin(segmentId, activeTime) {
  const { updatedAt } = hashMapAdmin[segmentId];
  hashMapAdmin[segmentId] = {
    ...hashMapAdmin[segmentId],
    active_time: activeTime,
    expireAt: new Date(new Date(updatedAt).getTime() + activeTime * 1000),
  };
}

function getStatus() {
  return new Promise((resolve) => {
    if (!isConnected) {
      resolve('disconnected');
      return;
    }

    resolve('connected');
  });
}

function getStatusOfSegment(id) {
  return hashMap[id];
}

function getMainStatusOfSegment(id) {
  return hashMapMainStatus[id];
}

module.exports = {
  sync,
  getStatus,
  getStatusOfSegment,
  cacheTrafficStatus,
  updateHashMapMainStatus,
  getMainStatusOfSegment,
  deleteHashMapAdmin,
  inactiveHashMapAdmin,
};
