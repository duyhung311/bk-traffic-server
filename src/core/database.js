const _ = require('lodash');
const mongoose = require('mongoose');
const Logger = require('./logger');
const { CodeError, ErrorType } = require('./error');

const { ObjectId } = mongoose.Types;

function init(callback = () => { }) {
  const uri = process.env.DATABASE_URI;
  Logger.info('Start connect to database %s', uri);
  mongoose.connect(uri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 5000, // Reconnect every 500ms
  }).then(() => {
    callback();
    mongoose.connection.once('disconnected', () => {
      Logger.warn('Try to reconnect mongodb after 5s');
      setTimeout(() => {
        init(callback);
      }, 5000);
    });
  }).catch((err) => {
    callback(err);
    Logger.warn('Try to reconnect mongodb after 5s');
    setTimeout(() => {
      init(callback);
    }, 5000);
  });
}

async function findOne(model, query, populate) {
  try {
    const ref = mongoose.model(model);
    let cursor = ref.findOne(query);
    if (populate) {
      cursor = cursor.populate(populate);
    }
    const docs = await cursor;
    if (!docs) {
      return docs;
    }
    return docs.toObject();
  } catch (error) {
    throw new CodeError({ ...ErrorType.serviceError, debugError: error });
  }
}

async function findMany(model, query, sort, limit = null, skip, populate, select = null) {
  try {
    const ref = mongoose.model(model);
    let cursor = ref.find(query);
    if (!_.isEmpty(sort)) {
      cursor = cursor.sort(sort);
    }
    if (skip > 0) {
      cursor = cursor.skip(skip);
    }
    if (limit) {
      cursor = cursor.limit(limit);
    }
    if (populate) {
      cursor = cursor.populate(populate);
    }
    if (select) {
      cursor = cursor.select(select);
    }
    const docs = await cursor;
    return docs;
  } catch (error) {
    throw new CodeError({ ...ErrorType.serviceError, debugError: error });
  }
}

async function create(model, query) {
  try {
    const ref = mongoose.model(model);
    const doc = await ref.create(query);
    return doc.toObject();
  } catch (err) {
    throw new CodeError({ ...ErrorType.serviceError, debugError: err });
  }
}

async function updateOne(model, query, update) {
  try {
    const ref = mongoose.model(model);
    const doc = await ref.updateOne(query, update);
    return doc;
    // return doc.lean();
  } catch (err) {
    throw new CodeError({ ...ErrorType.internalServerError, debugError: err });
  }
}

async function updateOneOrCreate(model, query, update) {
  try {
    const ref = mongoose.model(model);
    const doc = await ref.updateOne(query, update, { upsert: true });
    return doc;
  } catch (err) {
    throw new CodeError({ ...ErrorType.internalServerError, debugError: err });
  }
}

async function updateMany(model, query, update) {
  try {
    const ref = mongoose.model(model);
    const doc = await ref.updateMany(query, update);
    return doc;
  } catch (err) {
    throw new CodeError({ ...ErrorType.internalServerError, debugError: err });
  }
}

async function deleteOne(model, query) {
  try {
    const ref = mongoose.model(model);
    const doc = await ref.deleteOne(query);
    return doc;
    // return doc.lean();
  } catch (err) {
    throw new CodeError({ ...ErrorType.internalServerError, debugError: err });
  }
}

async function deleteMany(model, query) {
  try {
    const ref = mongoose.model(model);
    const doc = await ref.deleteMany(query);
    return doc;
    // return doc.lean();
  } catch (err) {
    throw new CodeError({ ...ErrorType.internalServerError, debugError: err });
  }
}

async function getCount(model, query) {
  try {
    const ref = mongoose.model(model);
    const doc = await ref.count(query);
    return doc;
    // return doc.lean();
  } catch (err) {
    throw new CodeError({ ...ErrorType.internalServerError, debugError: err });
  }
}

async function insertMany(model, data) {
  try {
    const ref = mongoose.model(model);
    const doc = await ref.insertMany(data);
    return doc;
  } catch (err) {
    throw new CodeError({ ...ErrorType.internalServerError, debugError: err });
  }
}

function aggregate(model, pipeline = []) {
  return mongoose.model(model).aggregate(pipeline);
}

module.exports = {
  init,
  ObjectId,
  findOne,
  findMany,
  updateMany,
  updateOne,
  create,
  deleteOne,
  getCount,
  updateOneOrCreate,
  deleteMany,
  insertMany,
  aggregate,
};
