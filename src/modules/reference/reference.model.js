const mongoose = require('mongoose');

const schemas = new mongoose.Schema({
  name: String,
  group: String,
  key: String,
  value: String,
  note: String,
}, {
  timestamps: true,
});

const name = 'References';
mongoose.model(name, schemas, name);

module.exports = {
  Name: name,
  ValidateSchema: {},
};
