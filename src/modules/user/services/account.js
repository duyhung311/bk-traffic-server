const Validator = require('../../../core/validator');
const Database = require('../../../core/database');
const { BaseError, ErrorType, Reason } = require('../../../core/error');
const Model = require('../models');

function findOne(query, populate) {
  return Database.findOne(Model.Account.Name, query, populate);
}
function deleteOne(query) {
  return Database.deleteOne(Model.Account.Name, query);
}
function validate(data, fields) {
  return Validator.validate(Model.Account.ValidateSchema, data, fields);
}

function validateInput(data, fields) {
  return Validator.validate(Model.Account.ValidateSchema, data, fields);
}

async function insertOne(data, skipCheckExist = false) {
  if (!skipCheckExist) {
    const existed = await Database.findOne(Model.Account.Name, {
      $or: [
        { email: data.emaim },
        { tp_id: data.tp_id },
      ],
    });
    if (existed) {
      const error = new BaseError(ErrorType.badRequest);
      if (data.email) {
        error.addError('email', Reason.duplicated);
      }
      if (data.tp_id) {
        error.addError('tp_id', Reason.duplicated);
      }
      throw error;
    }
  }

  return Database.create(Model.Account.Name, data);
}

function updateOne(query, data) {
  return Database.updateOne(Model.Account.Name, query, data);
}
module.exports = {
  findOne,
  validate,
  validateInput,
  insertOne,
  updateOne,
  deleteOne,
};
