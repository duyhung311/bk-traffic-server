const mongoose = require('mongoose');
const modelNames = require('../../config/model-names');

const polyline = new mongoose.Schema({
  type: {
    type: String,
    enum: ['LineString'],
    required: true,
  },
  coordinates: {
    type: [[Number]], // Array of arrays of arrays of numbers
    required: true,
  },
});

const schemas = new mongoose.Schema({
  segment: {
    type: Number,
    required: true,
    ref: modelNames.segment,
  },
  color: String,
  velocity: {
    type: Number,
    default: 0,
    min: 0,
  },
  source: {
    type: String,
  },
  polyline: {
    type: polyline,
    required: true,
    index: '2dsphere',
  },
  period_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: modelNames.period,
  },
  include_user_report: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const name = modelNames.segmentStatus;
mongoose.model(name, schemas, name);

module.exports = {
  Name: name,
  ValidateSchema: {},
};
