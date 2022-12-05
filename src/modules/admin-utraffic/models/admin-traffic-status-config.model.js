const Joi = require('joi');
const mongoose = require('mongoose');

const { Schema } = mongoose;
const modelName = require('../../../config/model-names');
const { adminReportType } = require('../../../config/constant');

const { ObjectId } = mongoose.Types;
Joi.objectId = require('joi-objectid')(Joi);

const adminConfigModelName = modelName.adminTrafficStatusConfig;

const adminConfigSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        adminReportType.line,
        adminReportType.circle,
        adminReportType.rectangle,
        adminReportType.speech,
      ],
      required: true,
    },
    coordinates: {
      type: [[Number]],
      required: true,
    },
    velocity: {
      type: Number,
      default: 0,
      min: 0,
      max: 60,
      required: true,
    },
    active_time: {
      type: Number,
      required: true,
    },
    radius: {
      type: Number,
      min: 100,
      max: 2000,
    },
    option: {
      type: Number,
      enum: [0, 1],
    },
    causes: {
      type: [String],
    },
    images: {
      type: [String],
    },
    description: {
      type: String,
    },
    user_id: {
      type: ObjectId,
      required: true,
      ref: modelName.user,
    },
    speech_record_id: {
      type: ObjectId,
      ref: modelName.speechRecord,
    },
  },
  { timestamps: true },
);

const ValidateSchema = {
  type: Joi.string()
    .valid(adminReportType.line, adminReportType.circle, adminReportType.rectangle)
    .required(),
  coordinates: Joi.array().items(Joi.array()).required(),
  velocity: Joi.number().min(0).max(60).required(),
  radius: Joi.number(),
  option: Joi.number().valid(0, 1),
  active_time: Joi.number().greater(0).required(),
  causes: Joi.array(),
  images: Joi.array(),
  description: Joi.string().allow(null, ''),
  user_id: Joi.objectId().required(),
};

const SpeechReportValidateSchema = {
  type: Joi.string()
    .valid(adminReportType.line, adminReportType.circle, adminReportType.rectangle, adminReportType.speech)
    .required(),
  coordinates: Joi.array().items(Joi.array()),
  radius: Joi.number(),
  option: Joi.number().valid(0, 1),
  active_time: Joi.number().min(300).max(7200).required(),
  user_id: Joi.objectId().required(),
  speech_record_id: Joi.objectId().required(),
};

const Model = mongoose.model(
  adminConfigModelName,
  adminConfigSchema,
  adminConfigModelName,
);

module.exports = {
  Name: adminConfigModelName,
  ValidateSchema,
  SpeechReportValidateSchema,
  Model,
};
