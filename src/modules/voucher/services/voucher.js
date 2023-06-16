const _ = require('lodash');
const Database = require('../../../core/database');
const Model = require('../models');

function findMany(query, sort, limit, populate) {
  return Database.findMany(Model.Voucher.Name, query, sort, limit, null, populate);
}
function findOne(query, populate) {
  return Database.findOne(Model.Voucher.Name, query, populate);
}
function deleteOne(query) {
  return Database.deleteOne(Model.Voucher.Name, query);
}
async function updateOne(query, data) {
  // const allowFields = ['name',
  //     'email',
  //     'avatar',
  //     'status',
  //     'about_me',
  //     'evaluation_score',
  //     'evaluation_count',
  //     'phone'];

  // data = _.pick(data, allowFields);
  // const existedFields = [];
  // for (let key in data) {
  //     existedFields.push(key);
  // }

  // const { error, value } = Validator.validate(Model.User.ValidateSchema, data, existedFields);
  // if (error) {
  //     throw error;
  // }

  return Database.updateOne(Model.Voucher.Name, query, data);
}
function randomString(length) {
  return Math.round((36 ** (length + 1) - Math.random() * 36 ** length)).toString(36).slice(1);
}
async function insertOne(data) {
  const allowFields = ['name',
    'value',
    'content',
    'image',
    'partner_id',
    'quantity',
    'type',
  ];

  const pickedDataAllowed = _.pick(data, allowFields);
  const pickedData = _.omit(pickedDataAllowed, _.isUndefined);

  // const { error, value } = Validator.validate(
  //     _.pick(Model.Voucher.ValidateSchema, existedFields),
  //     data,
  //     existedFields);
  // if (error) {
  //     throw error;
  // }

  return Database.create(Model.Voucher.Name, pickedData);
}

module.exports = {
  findMany,
  findOne,
  updateOne,
  randomString,
  insertOne,
  deleteOne,
};
