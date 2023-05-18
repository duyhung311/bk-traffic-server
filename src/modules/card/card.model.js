const mongoose = require('mongoose');
const _ = require('lodash');

const { Schema } = mongoose;
const modelNames = require('../../config/model-names');

const modelName = 'Card';

const CardSchemas = new Schema({
  code: {
    type: String,
  },
  serial: {
    type: String,
  },
  type: {
    type: String,

  },
  status: {
    type: Number,
    default: 0,

  },
}, {
  timestamps: true,
});

mongoose.model(modelName, CardSchemas, modelName);

module.exports = {
  Name: modelName,
};
