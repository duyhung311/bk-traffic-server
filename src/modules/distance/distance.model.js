const mongoose = require('mongoose');
const Joi = require('joi');
const modelNames = require('../../config/model-names');

const schema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: modelNames.user,
  },
  distance: {
    type: Number,
    required: true,
  },
  point_received: {
    type: Number,
    required: true,
    min: 0,
  },
  last_time_updated: {
    type: Date,
    required: true,
  },
  last_point_updated: {
    type: Number,
    default: 0,
  },
});

mongoose.model(modelNames.distance, schema, modelNames.distance);

const ValidateSchema = {
  user: Joi.any(),
  distance: Joi.number().required(),
  point_received: Joi.number().min(0).required(),
  last_time_updated: Joi.date().required(),
  last_point_updated: Joi.number(),
};

module.exports = {
  ValidateSchema,
};
