const _ = require('lodash');
const Joi = require('joi');
const mongoose = require('mongoose');
const {
  CodeError, ErrorType, Reason,
} = require('./error');

const { ObjectId } = mongoose.Types;

function validate(validateSchema, data = {}, fields = []) {
  const schema = fields.length > 0 ? _.pick(validateSchema, fields) : validateSchema;
  const joiSchema = Joi.object().keys(schema);
  const { error, value } = Joi.validate(data, joiSchema, { abortEarly: false });

  if (error) {
    const path = (error.details) ? error.details : [];
    const errorFields = path.map((item) => {
      const type = item.type === 'any.required'
        ? Reason.required
        : Reason.invalid;
      return {
        ...type,
        domain: item.context.key,
        message: item.message,
      };
    });
    return {
      error: new CodeError({
        ...ErrorType.badRequest,
        errors: errorFields,
        debugError: error,
      }),
      value,
    };
  }
  return { error: null, value };
}

/**
 * Return null if valid, otherwise return Error.Reason_Type
 * @param {*} latitude
 */
function checkLatitude(latitude) {
  if (!latitude) {
    return Reason.required;
  } if (latitude >= -90 && latitude <= 90) {
    return null;
  }
  return { ...Reason.invalid, message: 'Latitude: [-90,90]' };
}

/**
 * Return null if valid, otherwise return Error.Reason_Type
 * @param {*} latitude
 */
function checkLongitude(longitude) {
  if (!longitude) {
    return Reason.required;
  } if (longitude >= -180 && longitude <= 180) {
    return null;
  }
  return { ...Reason.invalid, message: 'Longitude: [-180,180]' };
}

function checkTypeWithCoordinates(
  type,
  coordinates,
  radius,
  option,
  errors = [],
) {
  const allowType = ['rectangle', 'line', 'circle'];
  if (!type || !allowType.includes(type)) {
    errors.push({
      key: 'type',
      value: {
        ...Reason.invalid,
        message: 'type must in [\'rectangle\', \'line\', \'circle\']',
      },
    });
  }
  if (type === 'rectangle') {
    if (!coordinates || coordinates.length !== 4) {
      errors.push({
        key: 'coordinates',
        value: {
          ...Reason.invalid,
          message: 'coordinates of rectangle must have 4 points',
        },
      });
    }
  } else if (type === 'line') {
    if (!coordinates || coordinates.length !== 2) {
      errors.push({
        key: 'coordinates',
        value: {
          ...Reason.invalid,
          message: 'coordinates of line must have 2 points',
        },
      });
    }
    if (![0, 1].includes(option)) {
      errors.push({
        key: 'option',
        value: {
          ...Reason.invalid,
          message: 'option must be 0 or 1',
        },
      });
    }
  } else if (type === 'circle') {
    if (!coordinates || coordinates.length !== 1) {
      errors.push({
        key: 'coordinates',
        value: {
          ...Reason.invalid,
          message: 'coordinates of circle must have 1 point',
        },
      });
    }
    if (!radius || radius <= 0 || radius > 3000 || Number.isNaN(radius)) {
      errors.push({
        key: 'radius',
        value: {
          ...Reason.invalid,
          message: 'range of radius is 1 to 3000 meters',
        },
      });
    }
  }
}

function checkLatLngInCoordinates(coordinates, errors = []) {
  if (coordinates && Array.isArray(coordinates) && coordinates.length > 0) {
    for (let i = 0; i < coordinates.length; i += 1) {
      if (!Array.isArray(coordinates[i]) || coordinates[i].length !== 2) {
        errors.push({
          key: 'coordinates',
          value: {
            ...Reason.invalid,
            message: `coordinates [${i}] must include lat and lng`,
          },
        });
      } else {
        const lat = coordinates[i][0];
        const lng = coordinates[i][1];
        let err = checkLatitude(lat);
        if (err) {
          errors.push({
            key: `lat_${i + 1}`,
            value: err,
          });
          err = null;
        }
        err = checkLongitude(lng);
        if (err) {
          errors.push({
            key: `lng_${i}`,
            value: err,
          });
        }
      }
    }
  } else {
    errors.push({
      key: 'coordinates',
      value: {
        ...Reason.invalid,
        message: 'coordinates must be array',
      },
    });
  }
}

function validateForMultiUserReport(data) {
  const errors = {};
  if (!data.velocity || data.velocity < 0) {
    errors.velocity = Reason.invalid;
  }
  if (!data.segments || data.segments.length === 0) {
    errors.segments = Reason.invalid;
  }
  return errors;
}

function isDatabaseId(id) {
  return ObjectId.isValid(id);
}

module.exports = {
  validate,
  isDatabaseId,
  checkLatitude,
  checkLongitude,
  checkTypeWithCoordinates,
  checkLatLngInCoordinates,
  validateForMultiUserReport,
};
