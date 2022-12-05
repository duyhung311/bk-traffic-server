const Joi = require('joi');
const mongoose = require('mongoose');
const _ = require('lodash');

const { Schema } = mongoose;
const modelNames = require('../../config/model-names');

const modelName = 'WareHouse';

const WareHouseSchemas = new Schema({
  point_total: {
    type: Number,
    default: 1000000,
  },
  point_current: {
    type: Number,
    default: 1000000,
  },
}, {
  timestamps: true,
});

mongoose.model(modelName, WareHouseSchemas, modelName);

module.exports = {
  Name: modelName,
};
