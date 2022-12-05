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

const schemas = new mongoose.Schema(
  {
    segmentId: {
      type: Number,
      required: true,
      ref: modelNames.segment,
    },
    polyline: {
      type: polyline,
      required: true,
      index: '2dsphere',
    },
    segmentStatus: {
      type: Object,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

mongoose.model(
  modelNames.baseSegmentStatus,
  schemas,
  modelNames.baseSegmentStatus,
);

module.exports = {};
