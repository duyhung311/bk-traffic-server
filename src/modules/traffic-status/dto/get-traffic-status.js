const Joi = require('joi');

module.exports = {
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  time: Joi.number().min(0).optional(),
  zoom: Joi.number().max(21).min(1).optional(),
  radius_in_meter: Joi.number().min(0).optional(),
  segment_id: Joi.string().optional(),
  limit: Joi.number().min(0),
  level: Joi.number().optional(),
  include_user_report: Joi.boolean().optional(),
};
