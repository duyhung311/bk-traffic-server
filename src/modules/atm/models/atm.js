const mongoose = require("mongoose");

const modelName = "atms";

const atmSchema = mongoose.Schema({
  _id: mongoose.Types.ObjectId,
  name: String,
  address: String,
  number_atm: Number,
  work_time: String,
  phone_number: String,
  branch_atm: String,
  latitude: Number,
  longitude: Number,
  rate: Number,
  numberOfRate: Number
});

model = mongoose.model(modelName, atmSchema);

module.exports = {
  //ValidateSchema: validateSchemas,
  Name: modelName,
  Model : model
}