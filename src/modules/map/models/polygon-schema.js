const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
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
