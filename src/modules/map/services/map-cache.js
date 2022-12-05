const fs = require('fs');
const Logger = require('../../../core/logger');

let isConnected = false;
let hashMap = {};

async function init(getSegments = async () => [], getCount = async () => 0) {
  if (fs.existsSync('tmp/hashMap.json')) {
    fs.readFile('tmp/hashMap.json', 'utf-8', (err, data) => {
      if (err) {
        throw err;
      }
      hashMap = JSON.parse(data.toString());
    });
    Logger.info('[Hash Cache] HashMap data is loaded.');
    isConnected = true;
    return;
  }
  try {
    Logger.info('[Hash Cache] Start cache map');
    const count = await getCount();
    let page = 1;
    const limit = 200;
    const totalPage = Math.ceil(count / limit);
    while (page <= totalPage) {
      // eslint-disable-next-line no-await-in-loop
      const segments = await getSegments(
        {},
        { limit, skip: (page - 1) * limit },
      );
      for (let i = 0; i < segments.length; i += 1) {
        const segment = segments[i].toObject();
        if (!segment) {
          Logger.error('[Hash Cache] Segment error', segments[i]);
        } else if (hashMap[segment.start_node]) {
          hashMap[segment.start_node].push(segment);
        } else {
          hashMap[segment.start_node] = [segment];
        }
      }
      page += 1;
    }
    isConnected = true;
    Logger.info(
      'Insert segments to cache successfully, count start_node: %d',
      Object.keys(hashMap).length,
    );
    const data = JSON.stringify(hashMap);
    fs.writeFile('tmp/hashMap.json', data, (err) => {
      if (err) {
        throw err;
      }
      Logger.info('[Hash Cache] HashMap data is saved.');
    });
  } catch (error) {
    isConnected = false;
    Logger.error('Init cache error %o', error);
  }
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

function getSegmentsByStartNode(startNodeId) {
  return new Promise((resolve, reject) => {
    if (!isConnected) {
      reject(new Error('Not connect to map cache'));
      return;
    }
    const segments = hashMap[startNodeId] || [];
    resolve(segments);
  });
}

function getListSegmentsByStartNode(startNodeId) {
  if (!isConnected) {
    Logger.error('Not connect to map cache');
    return [];
  }
  return hashMap[startNodeId] || [];
}

module.exports = {
  init,
  getStatus,
  getSegmentsByStartNode,
  getListSegmentsByStartNode,
};
