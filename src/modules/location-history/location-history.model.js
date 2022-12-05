const mongoose = require('mongoose');
const modelNames = require('../../config/model-names');

const schemas = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: modelNames.user,
  },
  lat: Number,
  lng: Number,
  segment: {
    type: Number,
    ref: modelNames.segment,
  },
  street_id: {
    type: Number,
    ref: modelNames.street,
  },
  street_type: {
    type: String,
  },
  token: String,
  period: {
    type: mongoose.Schema.Types.ObjectId,
    ref: modelNames.period,
  },
}, {
  timestamps: true,
});

const name = modelNames.locationHistory;
module.exports = mongoose.model(name, schemas, name);
