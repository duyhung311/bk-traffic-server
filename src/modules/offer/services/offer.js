const Database = require('../../../core/database');
const Model = require('../models');

function findMany(query, sort, limit, populate) {
  return Database.findMany(Model.Offer.Name, query, sort, limit, null, populate);
}
function findOne(query, populate) {
  return Database.findOne(Model.Offer.Name, query, populate);
}
async function insertOne(data) {
  // const allowFields = ['name',
  //     'username',
  //     'email',
  //     'avatar',
  //     'status',
  //     'about_me',
  //     'phone'];

  // data = _.pick(data, allowFields);
  // const existedFields = [];
  // for (let key in data) {
  //     if(typeof(data[key]) != 'undefined'){
  //         existedFields.push(key);
  //     } else{
  //         delete data[key];
  //     }
  // }

  // const { error, value } = Validator.validate(
  //     _.pick(Model.User.ValidateSchema, existedFields),
  //     data,
  //     existedFields);
  // if (error) {
  //     throw error;
  // }

  return Database.create(Model.Offer.Name, data);
}
async function updateOne(query, data) {
  return Database.updateOne(Model.Offer.Name, query, data);
}
module.exports = {
  findMany,
  findOne,
  insertOne,
  updateOne,
};
