const mongoose = require('mongoose');
const modelNames = require('../../../config/model-names');

const schema = new mongoose.Schema({
  address_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  segment_id: {
    type: Number,
    required: true,
  },
  name: String,
}, {
  timestamps: true,
});

mongoose.model(modelNames.vohAddress, schema, modelNames.vohAddress);
