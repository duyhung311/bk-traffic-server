/* This file no more in used */

const redis = require('redis');
const Logger = require('../../../core/logger');

let client;
let isConnected = false;

function init(getSegments = async () => [], getCount = async () => 0) {
  client = redis.createClient(); // this creates a new client
  client.on('connect', () => {
    Logger.info('Redis client connected');
    Logger.info('Check segments in redis');
    client.get('hadSegments', async (error, result) => {
      if (error) {
        Logger.error('Check segments in redis error %o', error);
      }
      if (result === 'true') {
        Logger.info('Redis had segments');
        isConnected = true;
        return;
      }

      Logger.info('Start insert segments to redis');
      try {
        const count = await getCount();
        let page = 1;
        const limit = 200;
        const totalPage = Math.ceil(count / limit);
        while (page <= totalPage) {
          // eslint-disable-next-line no-await-in-loop
          const segments = await getSegments({}, { limit, skip: (page - 1) * limit });
          for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i].toObject();
            if (!segment) {
              Logger.error('segment error', segments[i]);
              continue;
            }
            client.hset(segment.start_node.toString(), segment.end_node.toString(), JSON.stringify(segment));
          }
          Logger.info('Redis: inserted %d segments to redis (page %d/%d)', segments.length, page, totalPage);
          page += 1;
        }
        Logger.info('Redis: set hadSegments to true');
        client.set('hadSegments', 'true');
        isConnected = true;
        Logger.info('Insert segments to redis successfully');
      } catch (err) {
        Logger.error('Init redis error %o', err);
      }
    });
  });

  client.once('error', (err) => {
    Logger.error('Something went wrong %o', err);
    isConnected = false;
  });
}

function getStatus() {
  return new Promise((resolve) => {
    if (!isConnected) {
      resolve('disconnected');
      return;
    }

    client.get('hadSegments', (error, result) => {
      if (error) {
        resolve('error');
      } else {
        Logger.info('Redis had segments', result);
        resolve('connected');
      }
    });
  });
}

function getSegmentsByStartNode(startNodeId) {
  return new Promise((resolve, reject) => {
    if (!isConnected) {
      reject(new Error('Not connect to redis'));
      return;
    }

    client.hgetall(startNodeId.toString(), (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      // console.log('Redis get result', startNodeId, result);
      const segments = Object.values(result).map((item) => JSON.parse(item));

      resolve(segments);
    });
  });
}

module.exports = {
  init,
  getStatus,
  getSegmentsByStartNode,
};
