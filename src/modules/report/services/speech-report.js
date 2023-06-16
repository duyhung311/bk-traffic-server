const _ = require('lodash');
const Database = require('../../../core/database');
const Validator = require('../../../core/validator');
const Model = require('../models');

function validate(data) {
  const allowFields = ['user', 'segments', 'source'];

  const existedFields = [];
  const newData = {};
  allowFields.forEach((key) => {
    if (typeof data[key] !== 'undefined') {
      existedFields.push(key);
      newData[key] = data[key];
    }
  });

  return Validator.validate(
    _.pick(Model.SpeechReport.ValidateSchema, existedFields),
    newData,
    existedFields,
  );
}

async function insertOne(data) {
  return Database.create(Model.SpeechReport.Name, data);
}

module.exports = {
  validate,
  insertOne,
};
