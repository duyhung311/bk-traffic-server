const mongoose = require('mongoose');
const modelNames = require('../../config/model-names');

const schemas = new mongoose.Schema({
  name: String,
  start_time: {
    type: Number,
    default: -1,
    unique: true,
  },
  end_time: {
    type: Number,
    default: -1,
    unique: true,
  },
});

mongoose.model(modelNames.period, schemas, modelNames.period);
