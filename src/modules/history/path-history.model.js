const mongoose = require('mongoose');
const modelNames = require('../../config/model-names');

const schemas = new mongoose.Schema({
  segments: {
    type: [Object],
  },
}, {
  timestamps: true,
});

mongoose.model(modelNames.pathHistory, schemas, modelNames.pathHistory);
