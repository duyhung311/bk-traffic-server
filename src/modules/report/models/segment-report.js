const Joi = require('joi');
const mongoose = require('mongoose');
const modelNames = require('../../../config/model-names');

const { Schema } = mongoose;

const LocationSchema = new Schema({
  type: {
    type: String, // Don't do `{ location: { type: String } }`
    enum: ['Point'], // 'location.type' must be 'Point'
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: modelNames.user,
    },
    segment: {
      type: Number,
      required: true,
      ref: modelNames.segment,
    },
    center_point: {
      // use for search
      type: LocationSchema,
      required: true,
      index: '2dsphere',
    },
    velocity: Number,
    description: String,
    images: [{ type: String }],
    period_id: {
      type: Schema.Types.ObjectId,
      ref: modelNames.period,
      required: true,
    },
    causes: [{ type: String }],
    source: {
      type: String,
      enum: ['user', 'system'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  },
);

const validateSchemas = {
  user: Joi.string().required(),
  segment: Joi.string().required(),
  velocity: Joi.number().min(0).max(200).required(),
  description: Joi.string().required(),
  causes: Joi.array().required(),
};

mongoose.model(modelNames.segmentReport, schema, modelNames.segmentReport);

module.exports = {
  ValidateSchema: validateSchemas,
  Name: modelNames.segmentReport,
};
