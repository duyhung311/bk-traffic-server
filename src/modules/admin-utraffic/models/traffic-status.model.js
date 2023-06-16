const Joi = require('joi');
const mongoose = require('mongoose');

const { Schema } = mongoose;
const modelName = require('../../../config/model-names');
Joi.objectId = require('joi-objectid')(Joi);

const { ObjectId } = mongoose.Types;

const trafficStatusModelName = modelName.trafficStatus;

const trafficStatusSchema = new Schema(
  {
    segment_id: {
      type: Number,
      required: true,
      ref: modelName.segment,
    },
    velocity: {
      type: Number,
      default: 0,
      min: 0,
      max: 60,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    active_time: {
      type: Number,
      required: true,
    },
    expireAt: {
      type: Date,
    },
    description: {
      type: String,
    },
    config_id: {
      type: ObjectId,
      ref: modelName.adminTrafficStatusConfig,
    },
  },
  { timestamps: true },
);

const ValidateSchema = {
  segment_id: Joi.string().required(),
  velocity: Joi.number().min(0).max(60).required(),
  source: Joi.string().required(),
  active_time: Joi.number().greater(0).required(),
  expireAt: Joi.date(),
  description: Joi.string(),
  config_id: Joi.objectId(),
};

const Model = mongoose.model(trafficStatusModelName, trafficStatusSchema, trafficStatusModelName);

module.exports = {
  Name: trafficStatusModelName,
  ValidateSchema,
  Model,
};
