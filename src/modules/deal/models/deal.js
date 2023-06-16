const Joi = require('joi');
const mongoose = require('mongoose');
const _ = require('lodash');

const { Schema } = mongoose;
const modelNames = require('../../../config/model-names');

const modelName = 'Deal';

const DealSchemas = new Schema({
  code: {
    type: String,
  },
  content: {
    type: String,
  },
  type: {
    type: String,

  },
  point: {
    type: Number,
    default: 0,

  },
  send_id: {
    type: Schema.Types.ObjectId,
    required: false,
    ref: modelNames.user,
  },
  receive_id: {
    type: Schema.Types.ObjectId,
    required: false,
    ref: modelNames.user,
  },

  offer_id: {
    type: Schema.Types.ObjectId,
    ref: modelNames.offer,
  },
}, {
  timestamps: true,
});

mongoose.model(modelName, DealSchemas, modelName);

module.exports = {
  Name: modelName,
};
