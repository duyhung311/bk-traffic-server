const mongoose = require('mongoose');

const { Schema } = mongoose;

module.exports = new Schema({
  type: {
    type: String, // Don't do `{ location: { type: String } }`
    enum: ['Point'], // 'location.type' must be 'Point'
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});
