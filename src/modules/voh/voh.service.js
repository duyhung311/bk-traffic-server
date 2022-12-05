/* eslint-disable no-await-in-loop */
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const database = require('../../core/database');
const modelName = require('../../config/model-names');
const Logger = require('../../core/logger');
const Utils = require('../../core/utils');
const Schemas = require('./Schemas/index');
const trafficStatusCache = require('../traffic-status/traffic-status.cache');
const state = require('../../state');
const hottestAddress = require('./500-diem.json').data;

function findOne(query, populate) {
  return database.findOne(modelName.vohAddress, query, populate);
}

function findMany(query, { populate, limit } = {}) {
  return database.findMany(modelName.vohAddress, query, null, limit, null, populate);
}

function insertOne(data) {
  return database.create(modelName.vohAddress, data);
}

function insertMany(data) {
  return database.insertMany(modelName.vohAddress, data);
}

// https://en.wikipedia.org/wiki/Levenshtein_distance
function editDistance(_s1, _s2) {
  const s1 = Utils.removeAccents(_s1).toLowerCase();
  const s2 = Utils.removeAccents(_s2).toLowerCase();

  const costs = [];
  for (let i = 0; i <= s1.length; i += 1) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j += 1) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue),
            costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function improveSimilarity(s1, s2) {
  const split1 = s1.split(' ');
  const split2 = s2.split(' ');
  let sum = 0; let max = 0; let temp = 0;
  for (let i = 0; i < split1.length; i += 1) {
    max = 0;
    for (let j = 0; j < split2.length; j += 1) {
      temp = similarity(split1[i], split2[j]);
      if (max < temp) max = temp;
    }
    sum += max / split1.length;
  }
  return sum;
}

function connectDbVoh() {
  try {
    const uri = 'mongodb://dev:XhD%26rCrDAM%2BOPaeXcjUmae%21%2BM@139.180.134.61:27017/admin';
    const dbName = 'utraffic_voh';
    Logger.info('Start connect to database VOH: %s', uri);  
    const conn = mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useCreateIndex: true,
      dbName,
    });

    conn.catch((error) => {
      Logger.error('Can not connect to VOH DB');
      throw error;
    });

    conn.model('address', Schemas.AddressSchema, 'address');
    conn.model('record', Schemas.RecordSchema, 'record');
    conn.model('reason', Schemas.ReasonSchema, 'reason');
    conn.model('person_sharing', Schemas.PersonSchema, 'person_sharing');
    return conn;
  } catch (error) {
    Logger.error('Can not connect to VOH DB');
    throw error;
  }
}

async function addTrafficStatusFromVoh() {
  try {
    // const districts = await mongoose.model('address').aggregate([
    //   {
    //     $group:
    //         {
    //           _id: null,
    //           distinctDistrict: {
    //             $addToSet: '$district'
    //           }
    //         }
    //   }
    // ])
    const halfHourAgo = moment(new Date().getTime() - 30 * 60 * 1000).tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');

    const conn = connectDbVoh();
    const records = await conn.model('record').find({ status: { $ne: 'removed' }, created_on: { $gt: halfHourAgo } })
      .sort({ created_on: -1 });

    // let data = [];
    for (const record of records) {
      const address = await conn.model('address').findOne({ _id: record.address.oid });
      let flagIgnore = false;
      for (const district of address.district) {
        if (state.ignore_district.includes(district)) {
          flagIgnore = true;
          break;
        }
      }
      if (flagIgnore) {
        continue;
      }

      let maxSimilarity = 0.7;
      let arr = [];
      for (const addr of hottestAddress) {
        if (addr.segments.length > 0) {
          const similarityScore = improveSimilarity(addr.address.name, address.name);
          if (similarityScore > maxSimilarity) {
            maxSimilarity = similarityScore;
            arr = [];
            arr.push({
              id: addr.id,
              segments: addr.segments,
              name_in_file: addr.address.name,
              name_in_voh_db: address.name,
              similarity: maxSimilarity,
            });
          } else if (similarityScore === maxSimilarity) {
            arr.push({
              id: addr.id,
              segments: addr.segments,
              name_in_file: addr.address.name,
              name_in_voh_db: address.name,
              similarity: maxSimilarity,
            });
          }
        }
      }

      if (arr.length > 0) {
        const speed = state.speeds_voh[record.speed.oid.toString()];
        const reason = await conn.model('reason').findOne({ _id: record.reason.oid });
        for (const segment of arr[0].segments) {
          const segmentStatus = {
            velocity: speed,
            segment_id: segment.segment_id,
            active_time: 60 * 60, // 1 hour
            source: 'VOH',
            expireAt: new Date(new Date(record.created_on).getTime() + 60 * 60 * 1000),
            description: reason.name,
            createdAt: new Date(record.created_on),
            updatedAt: new Date(record.created_on),
          };

          // update cache
          const key = `${segment.segment_id}_VOH`;
          const mainTrafficStatus = trafficStatusCache.getMainStatusOfSegment(key);

          if (!mainTrafficStatus || segmentStatus.updatedAt > mainTrafficStatus.updatedAt) {
            await mongoose.model(modelName.trafficStatus).create(segmentStatus);
            trafficStatusCache.updateHashMapMainStatus(segmentStatus);
          }
        }
      }
    }
  } catch (error) {
    Logger.error(error);
    throw error;
  }
}

async function getNewsFromVOH() {
  try {
    const conn = connectDbVoh();
    const d = new Date();
    d.setHours(d.getHours() + 7);
    const dateNow = d.toISOString().slice(0, 10); // 2021-06-15T11:19:02.541Z ==>  2021-06-15
    const records = await conn.model('record').find({ status: { $ne: 'removed' }, created_on: { $gt: dateNow } })
      .sort({ created_on: -1 });
    const data = [];
    for (const record of records) {
      const address = await conn.model('address').findOne({ _id: record.address.oid });
      const speed = state.speeds_voh[record.speed.oid.toString()];
      const reason = await conn.model('reason').findOne({ _id: record.reason.oid });
      const person = await conn.model('person_sharing').findOne({ _id: record.personSharing.oid });
      data.push({
        address: {
          name: address.name,
          district: address.district,
        },
        speed,
        reason: reason.name,
        person: person.name,
        created_at: record.created_on,
      });
    }
    return data;
  } catch (error) {
    Logger.error(error);
    throw error;
  }
}

module.exports = {
  findOne,
  findMany,
  insertOne,
  insertMany,
  addTrafficStatusFromVoh,
  getNewsFromVOH,
};
