const Validator = require('../../../core/validator');
const Database = require('../../../core/database');
const modelNames = require('../../../config/model-names');
const Model = require('../models');

async function findMany() {
  return Database.findMany(modelNames.adminTrafficStatusConfig);
}

async function findById(id) {
  return Database.findOne(modelNames.adminTrafficStatusConfig, {
    _id: id,
  });
}

async function create(data) {
  return Database.create(modelNames.adminTrafficStatusConfig, data);
}

async function deleteById(id) {
  return Database.deleteOne(modelNames.adminTrafficStatusConfig, {
    _id: id,
  });
}

async function updateActiveTimeById(id, activeTime) {
  return Database.updateOne(
    modelNames.adminTrafficStatusConfig,
    { _id: id },
    { active_time: activeTime },
  );
}

function validateInput(data, fields) {
  return Validator.validate(
    Model.AdminTrafficStatusConfig.ValidateSchema,
    data,
    fields,
  );
}

function validateSpeechReportInput(data, fields) {
  return Validator.validate(
    Model.AdminTrafficStatusConfig.SpeechReportValidateSchema,
    data,
    fields,
  );
}

module.exports = {
  create,
  findMany,
  findById,
  deleteById,
  updateActiveTimeById,
  validateInput,
  validateSpeechReportInput,
};
