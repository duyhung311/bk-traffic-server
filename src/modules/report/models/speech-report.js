const Joi = require('joi');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const modelNames = require('../../../config/model-names');

const validSources = ['AD', 'user', 'system', 'other'];

const schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: modelNames.user,
    },
    segments: {
      type: [Number],
      default: null,
    },
    speech_record: {
      type: Schema.Types.ObjectId,
      ref: modelNames.speechRecord,
      required: true,
    },
    period_id: {
      type: Schema.Types.ObjectId,
      ref: modelNames.period,
      required: true,
    },
    source: {
      type: String,
      enum: validSources,
      default: 'other',
    },
    processed_date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const validateSchemas = {
  user: Joi.string().required(),
  segments: Joi.array().items(Joi.number().integer().positive()).unique(),
  source: Joi.string().valid(validSources),
};

mongoose.model(modelNames.speechReport, schema, modelNames.speechReport);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelNames.speechReport,
};
