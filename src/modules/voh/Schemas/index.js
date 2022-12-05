const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  personSharing: {
    type: Object,
    required: true,
  },
  address: {
    type: Object,
    required: true,
    ref: 'address',
  },
  speed: {
    type: Object,
    required: true,
    ref: 'speed',
  },
  reason: {
    type: Object,
    required: true,
    ref: 'reason',
  },
  distance: {
    type: String,
    required: true,
  },
  created_on: {
    type: String,
    required: true,
  },
  shares_count: {
    type: String,
    required: true,
  },
  notice: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  priority: {
    type: Boolean,
  },
});

const AddressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  district: {
    type: [String],
    required: true,
  },
  created_on: String,
});

const ReasonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  created_on: String,
});

const PersonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  created_on: String,
});

module.exports = {
  ReasonSchema,
  AddressSchema,
  RecordSchema,
  PersonSchema,
};
