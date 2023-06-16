const Joi = require('joi');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const modelNames = require('../../../config/model-names');
const { ObjectId } = require('../../../core/database');

const schema = new Schema(
  {
    _id: ObjectId,
    script: {
      type: Number,
      default: null,
    },
    data: {
      type: Buffer,
      required: true,
    },
    length: Number,
    contentType: String,
    encoding: String,
    dataEnhanced: {
      type: Buffer,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const validateSchemas = {
  script: Joi.number().integer().positive(),
  length: Joi.number().integer().positive(),
};

mongoose.model(modelNames.speechRecord, schema, modelNames.speechRecord);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelNames.speechRecord,
};
