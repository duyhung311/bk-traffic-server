const mongoose = require('mongoose');
const modelNames = require('../../config/model-names');

const schemas = new mongoose.Schema({
  mainStatus: {
    type: String,
    required: true
  },
  description: String,
  temperature: Number,
  humidity: Number,
  visibility: Number,
  pressure: Number,
  clouds: Number,
  windSpeed: Number,
  period: Number
}, {
  timestamps: true
});

const name = modelNames.weatherInfo;
mongoose.model(name, schemas, name);

module.exports = {
  Name: name,
  ValidateSchema: {},
};
