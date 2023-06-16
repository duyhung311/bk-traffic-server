const mongoose = require('mongoose');
const Joi = require('joi');
const modelNames = require('../../config/model-names');

const schema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  appName: {
    type: String,
    required: true,
  },
  versionCode: {
    type: Number,
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  CHPlayUrl: {
    type: String,
    required: true,
  },
});

mongoose.model(modelNames.appVersion, schema, modelNames.appVersion);

const ValidateSchema = {
  id: Joi.number().required(),
  appName: Joi.string().required(),
  versionCode: Joi.string().required(),
  version: Joi.string().required(),
  CHPlayUrl: Joi.string().required(),
};

module.exports = {
  ValidateSchema,
};
