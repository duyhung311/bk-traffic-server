const _ = require('lodash');
const Validator = require('../../../core/validator');
const Database = require('../../../core/database');
const { BaseError } = require('../../../core/error');

const Model = require('../models');
const Distance = require('../../distance');
const Service = require('../../warehouse/warehouse.service');
const ServiceVoucher = require('../../voucher/services');
const ServiceDeal = require('../../deal/services');

function findOne(query, populate) {
  return Database.findOne(Model.User.Name, query, populate);
}
function findMany(query, populate) {
  return Database.findMany(Model.User.Name, query, populate);
}
function deleteOne(query) {
  return Database.deleteOne(Model.User.Name, query);
}

async function insertOne(data) {
  const allowFields = [
    'name',
    'username',
    'email',
    'avatar',
    'status',
    'about_me',
    'phone',
  ];

  const pickedData = _.pick(data, allowFields);
  const existedFields = Object.keys(pickedData);
  const { error, value } = Validator.validate(
    _.pick(Model.User.ValidateSchema, existedFields),
    pickedData,
    existedFields,
  );
  if (error) {
    throw error;
  }

  return Database.create(Model.User.Name, value);
}

async function updateOne(query, data) {
  const allowFields = ['name',
    'email',
    'avatar',
    'status',
    'point',
    'about_me',
    'evaluation_score',
    'evaluation_count',
    'phone'];

  const pickedData = _.pick(data, allowFields);
  const { error, value } = Validator.validate(
    Model.User.ValidateSchema,
    pickedData,
    Object.keys(pickedData),
  );
  if (error) {
    throw error;
  }

  return Database.updateOne(Model.User.Name, query, value);
}

async function updatePoint(query, data) {
  return Database.updateOne(Model.User.Name, query, data);
}

async function updateEvaluation(query, score) {
  const user = await findOne(query);
  if (user) {
    const oldScore = user.evaluation_score || 0;
    const count = user.evaluation_count || 0;
    const newScore = (oldScore * count + score) / (count + 1);
    await updateOne(query, { evaluation_score: newScore, evaluation_count: count + 1 });
  }
}

async function updatePointFromDistance() {
  try {
    const type = 1;
    const time = 1;
    const distances = await Distance.Service.findMany({}, null);
    const warehouse = await Service.findOne({});
    if (warehouse == null) {
      await Service.insertOne({});
    }
    for (const ele of distances) {
      if ((ele.distance - ele.point_received) >= 1) {
        distance_to_point = (~~((ele.distance - ele.point_received) / 1)) * 1;
        point = distance_to_point * type * time;
        await Service.updateOne({}, { point_current: warehouse.point_current - point });
        await Distance.Service.updateOne(
          { _id: ele._id },
          {
            point_received: ele.point_received + distance_to_point,
          },
        );
        user = await findOne({ _id: ele.user });
        await updatePoint(
          { _id: ele.user }, { point: user.point + point },
        );
      }
    }
  } catch (err) {
    throw new BaseError(err);
  }
}

async function updatePointTime() {
  try {
    const distances = await Distance.Service.findMany({}, null);
    for (const ele of distances) {
      if ((ele.point_received - ele.last_point_updated) != 0) {
        let codeDeal = ServiceVoucher.Voucher.randomString(10);
        while (await ServiceDeal.Deal.findOne({ code: codeDeal })) {
          codeDeal = ServiceVoucher.Voucher.randomString(10);
        }

        const newDeal = {
          code: codeDeal,
          content: 'Giao dịch nhận điểm',
          receive_id: ele.user,
          point: ele.point_received - ele.last_point_updated,
          type: 'get point',
          message: '',

        };
        await ServiceDeal.Deal.insertOne(newDeal);
        await Distance.Service.updateOne(
          { _id: ele._id },
          {
            last_point_updated: ele.point_received,
          },
        );
      }
    }
  } catch (err) {
    throw new BaseError(err);
  }
}

module.exports = {
  findOne,
  insertOne,
  updateOne,
  updateEvaluation,
  updatePoint,
  findMany,
  deleteOne,
  updatePointFromDistance,
  updatePointTime,
};
