const _ = require('lodash');
const { default: axios } = require('axios');
const Database = require('./database');
const Redis = require('./redis');
const Util = require('./utils');
const Logger = require('./logger');
const State = require('../state');
const modelNames = require('../config/model-names');

const MAX_RETRY = 5;
const PERIOD_LENGTH = 30 * 60 * 1000; // in milisecond
const NUMBER_OF_PERIODS = 4; // number of periods to cache initially
let timestamp = Date.now(); // (in milisecond) start server time
let periodStep = 0;
let retry = 0;

const apiBaseUrl = process.env.BKTRAFFIC_ANALYXER;
const apiEndpoint = {
  inference: '/inference',
  sequenceInference: '/seq_inference',
  speechReport: '/speech_report/%speechReportId',
};
const api = axios.create({
  baseURL: apiBaseUrl,
});

/**
 * Call inference model
 * @param {[number]} segmentIds a list of segment ID
 * @param {number / [number]} timeToCache (in second)
 * @param {boolean} toPeriod returned response in period name format
 * @returns Promise of calling model that resolves
 * {
 *    <period_name>: {
 *        segment_id: List[number],
 *        velocity: List[number],
 *        LOS: List[string(A/B/C/D/E/F)],
 *    }
 * } or
 * {
 *    segment_id: List[number],
 *    velocity: List[number],
 *    LOS: List[string(A/B/C/D/E/F)],
 * }
 */
async function inference(segmentIds, timeToCache) {
  return api.post(
    apiEndpoint.inference,
    {
      segment_id: segmentIds,
      timestamp: timeToCache,
    },
  );
}

/**
 * Call sequence inference model
 * @param {[number]} segmentIds a list of segment ID
 * @param {number} startTime start timestamp (in second)
 * @returns Promise of calling model that resolves
 * {
 *    segment_id: List[number],
 *    velocity: List[number],
 *    ETA: List[number],
 *    LOS: List[string(A/B/C/D/E/F)],
 * }
 */
async function sequenceInference(segmentIds, startTime) {
  return api.post(
    apiEndpoint.sequenceInference,
    {
      segment_id: segmentIds,
      timestamp: startTime,
    },
  );
}

/**
 * Force processing a speech report
 * @param {number} speechReportId ID of speech report to be processed
 * @returns Promise resolves segment reports parsed from this speech report
 */
async function speechReport(speechReportId) {
  return api.get(apiEndpoint.speechReport.replace('%speechReportId', speechReportId));
}

/** ******************************************************************************************************************** */
/**
 * Cache estimated results from VelocityEstimator model to reduce calling directly
 * @param {number} numberOfPeriod number of periods to cache next
 * @returns Promise of model request
 */
async function cache(numberOfPeriod = 1) {
  const isConnected = await Redis.isConnected();
  if (!isConnected) {
    Logger.error('Redis down');
    throw new Error('Redis down');
  }

  const allSegments = await Database.findMany(modelNames.segment, {});
  const segmentIds = allSegments.map((segment) => segment._id);
  const timeToCache = [];
  const timeToLive = [];
  const currentTimestamp = Date.now();

  // magic code to set expire time of period cache
  for (let i = 0; i < numberOfPeriod; i += 1) {
    timeToCache.push(timestamp + periodStep * PERIOD_LENGTH);
    timeToLive.push(timestamp + (periodStep + 1) * PERIOD_LENGTH - currentTimestamp);
    periodStep += 1;
  }
  const periodToCache = _.uniq(timeToCache.map((time) => Util.timeToPeriod(time)));
  Logger.info('[Estimator] Start cache LOS at %s', periodToCache.join(', '));

  return inference(segmentIds, timeToCache.map((time) => Math.trunc(time / 1000)), true)
    .then((response) => {
      const { data } = response;
      periodToCache.forEach((period, me) => {
        data[period].segment_id.forEach((segmentId, you) => {
          const key = `est:${segmentId}:${period}`;
          Redis.setHash(
            key,
            {
              los: data[period].LOS[you],
              vel: data[period].velocity[you],
            },
          );
          Redis.setKeyExpire(key, Math.ceil(timeToLive[me] / 1000)); // expire in second
        });
      });
    })
    .catch((error) => {
      periodStep -= numberOfPeriod;
      throw error;
    });
}

/**
 * Trả về LOS từ cache, nếu không có sẵn cache trả về null
 * Read values from VelocityEstimator cache
 * @param {[Object]} segmentIds a list of segment ID
 * @param {number} time in milisecond
 * @param {string | [string]} fields name of fields to retrieve from cache
 * @returns Promise resolves a list of estimated values (LOS, velocity) from cache
 */
async function getCache(segmentIds, time, field) {
  const period = Util.timeToPeriod(time);
  const readCache = segmentIds.map(
    (segmentId) => Redis.getHash(`est:${segmentId}:${period}`, field),
  );

  return Promise.all(readCache)
    .then((result) => result.map((item) => item[field]))
    .catch((error) => {
      throw error;

      /**
       * Code dùng để gọi trực tiếp model và lưu vào cache
       * Call model directly then cache (warning: slow performance)
       * -> We use base-data instead
       */
      // return inference(segmentIds, time / 1000)
      //   .then((response) => {
      //     const { data } = response;
      //     data.segment_id.forEach((segmentId, i) => {
      //       const key = `est:${segmentId}:${period}`;
      //       Redis.setHash(
      //         key,
      //         {
      //           los: data[period].LOS[i],
      //           vel: data[period].velocity[i],
      //         },
      //       );
      //       Redis.setKeyExpire(key, Math.ceil(PERIOD_LENGTH / 1000));
      //     });
      //     return data.LOS.map((item) => item.los);
      //   })
      //   .catch((error) => {
      //     throw error;
      //   });
    });
}

async function getVelocity(segmentIds, time) {
  return getCache(segmentIds, time, 'vel');
}

async function getLOS(segmentIds, time) {
  return getCache(segmentIds, time, 'los');
}

/**
 *
 * @param {[number]} segments a list of segments { _id, length }
 * @param {number} startTime start timestamp (in milisecond)
 * @returns Promise resolves
 * {
 *    segment_ids: List[number],
 *    velocities: List[number],
 *    LOSes: List[string(A/B/C/D/E/F)],
 *    ETAs: List[number]
 * }
 */
async function estimateTravelTime(segments, startTime) {
  try {
    let travelTime = startTime; // in milisecond
    const velocities = [];
    const LOSes = [];
    const ETAs = [];
    for (const segment of segments) {
      // eslint-disable-next-line no-await-in-loop
      const velocity = parseFloat((await getVelocity([segment._id], travelTime))[0]);
      const los = Util.getLOSFromVelocity(velocity);
      const eta = segment.length / (velocity * State.KMPERHOUR_TO_MPERSECOND_CONST);
      velocities.push(velocity);
      LOSes.push(los);
      ETAs.push(eta);
      travelTime += eta * 1000;
    }

    return {
      segment_ids: segments.map((segment) => segment._id),
      velocities,
      LOSes,
      ETAs,
    };
  } catch (error) {
    Logger.error('[Estimator] %o', error);
    Logger.info('[Estimator] Call sequence_inference');

    return sequenceInference(segments.map((segment) => segment._id), Math.trunc(startTime / 1000))
      .then((result) => ({
        segment_ids: result.data.segment_id,
        velocities: result.data.velocity,
        LOSes: result.data.LOS,
        ETAs: result.data.ETA,
      }))
      .catch((err) => {
        throw err;
      });
  }
}

/**
 * Initialize caching estimator
 */
function init() {
  timestamp = Date.now();
  Logger.info('[Estimator] Init cache at %d', timestamp);

  cache(NUMBER_OF_PERIODS)
    .then(() => {
      retry = 0;
      Logger.info('[Estimator] Init cache successfully');
    })
    .catch(() => {
      if (retry >= MAX_RETRY) {
        Logger.error('[Estimator] Fail to init cache');
        return;
      }

      Logger.info('[Estimator] Try to re-cache after 5s');
      setTimeout(() => {
        retry += 1;
        init();
      }, 5000);
    });
}

async function processSpeechReport(speechReportId) {
  return speechReport(speechReportId)
    .then((response) => response.data)
    .catch((error) => {
      throw error;
    });
}

module.exports = {
  velocityEstimator: {
    init,
    cache,
    getVelocity,
    getLOS,
    estimateTravelTime,
  },
  processSpeechReport,
};
