const Joi = require('joi');
const mongoose = require('mongoose');
const _ = require('lodash');

const { Schema } = mongoose;
const modelNames = require('../../config/model-names');

const modelName = 'Gift';

const GiftSchemas = new Schema({
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  amount: {
    type: Number,
    default: 0,

  },
  point: {
    type: Number,
    default: 0,

  },
}, {
  timestamps: true,
});

mongoose.model(modelName, GiftSchemas, modelName);

module.exports = {
  Name: modelName,
};
