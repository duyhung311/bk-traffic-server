const mongoose = require('mongoose');
const modelNames = require('../../config/model-names');

const schemas = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: modelNames.user,
  },
  path: {
    type: mongoose.Schema.Types.ObjectId,
    ref: modelNames.pathHistory,
    default: null,
  },
  token: String,
  lat: Number,
  lng: Number,
  segment: {
    type: Number,
    ref: modelNames.segment,
    default: null,
  },
  active: Boolean,
  period: {
    type: mongoose.Schema.Types.ObjectId,
    ref: modelNames.period,
  },
}, {
  timestamps: true,
});

const name = modelNames.notification;
mongoose.model(name, schemas, name);

module.exports = {
  Name: name,
  ValidateSchema: {},
};
