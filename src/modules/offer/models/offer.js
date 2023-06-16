const Joi = require('joi');
const mongoose = require('mongoose');
const _ = require('lodash');

const { Schema } = mongoose;
const modelNames = require('../../../config/model-names');

const modelName = 'Offer';

const OfferSchemas = new Schema({
  code: {
    type: String,
  },
  status: {
    type: Number,
    default: 0,
  },
  voucher_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: modelNames.voucher,
  },
  customer_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: modelNames.user,
  },
}, {
  timestamps: true,
});

mongoose.model(modelName, OfferSchemas, modelName);

module.exports = {
  Name: modelName,
};
