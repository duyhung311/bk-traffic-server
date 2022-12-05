const redis = require('redis');
const Logger = require('./logger');
const { local } = require('../config/redis');

let retry = 0;
const Redis = redis.createClient(local);

function init() {
  Redis
    .connect()
    .then(() => {
      Logger.info('Redis connected successfully after retry %d time', retry);
      retry = 0;
    })
    .catch(() => {
      Logger.info('Try to reconnect Redis every 5s');
      setTimeout(() => {
        retry += 1;
        init();
      }, 5000);
    });
}

async function isConnected() {
  try {
    const pong = await Redis.ping();
    Logger.info('[Redis] Pong: %s', pong);
    return pong === 'PONG';
  } catch (error) {
    return false;
  }
}

async function getHash(key, fields, strict = true) {
  const result = {};
  if (fields.constructor === Array) {
    const values = await Redis.HMGET(key, fields);
    fields.forEach((field, i) => {
      result[field] = values[i];
    });
  } else if (fields) {
    const value = await Redis.HGET(key, fields);
    result[fields] = value;
  }

  const isEmpty = strict
    ? Object.values(result).every((x) => x === null || x === '')
    : Object.values(result).some((x) => x === null || x === '');

  if (isEmpty) {
    throw new Error('Empty Redis key');
  }
  return result;
}

async function setHash(key, values) {
  return Redis.HSET(key, values);
}

async function setZIndex(index, score, value) {
  return Redis.zAdd(index, { score, value });
}

async function getZIndex(index, min, max) {
  return Redis.ZRANGEBYSCORE(index, Math.ceil(min), Math.ceil(max));
}

async function getKeysByPattern(keyPattern = '*') {
  return Redis.KEYS(keyPattern);
}

async function setKeyExpire(key, timeToLive) {
  return Redis.EXPIRE(key, timeToLive);
}

module.exports = {
  init,
  isConnected,
  getHash,
  setHash,
  getKeysByPattern,
  setKeyExpire,
  setZIndex,
  getZIndex,
};
