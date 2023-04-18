const mongoose = require('mongoose');
const modelNames = require('../../../../../config/model-names');
const {Schema} = mongoose;

module.exports = new Schema({
  type: {
    type: String,
  },
  ref: {
    type: Number,
  },
  role: {
    type: String,
  },
});
