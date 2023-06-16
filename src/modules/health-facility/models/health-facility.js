const mongoose = require('mongoose');

const modelName = "Health_Facilities";

const HealthFacilitySchema = mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    partner_id: String,
    name: String,
    address: String,
    work_time: String,
    specialisation: [String],
    service: String,
    phone_number: String,
    latitude: Number,
    longitude: Number,
    license_img: String,
    // comments: [
    //     {
    //         user_id: String,
    //         user_name: String,
    //         content: String
    //     }
    // ],
    comment: [Object],
    location: [Number],
    rate: Number,
    numberOfRate: Number
});

model = mongoose.model(modelName, HealthFacilitySchema);

module.exports = {
    //ValidateSchema: validateSchemas,
    Name: modelName,
    Model: model
}