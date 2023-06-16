const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const { BaseError, ErrorType, Reason } = require('./error');
const state = require('../state');
// const moment = require('moment');
const Validator = require('./validator');

function timeToPeriod(timestamp) {
  const minute = new Date(timestamp).getMinutes();
  const hour = new Date(timestamp).getHours();
  const m = minute < 30 ? '00' : '30';
  return `period_${hour}_${m}`;
}

function hashPassword(password) {
  const saltRounds = 10;

  return new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, (error, encrypt) => {
      if (error) {
        reject(
          new BaseError({ ...ErrorType.internalServerError, debugError: error }),
        );
        return;
      }

      resolve(encrypt);
    });
  });
}

function comparePassword(needCheckPassword, encryptedPassword) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(needCheckPassword, encryptedPassword, (error, result) => {
      if (error) {
        reject(
          new BaseError({ ...ErrorType.internalServerError, debugError: error }),
        );
        return;
      }

      resolve(result);
    });
  });
}

/**
 * Return distance^2
 * @param {*} coord1
 * @param {*} coord2
 */
function getDistancePow2BetweenTwoCoords(coord1, coord2) {
  return (
    (parseFloat(coord1.lat) - parseFloat(coord2.lat)) ** 2
    + (parseFloat(coord1.lng) - parseFloat(coord2.lng)) ** 2
  );
}

function getDistanceBetweenTwoCoords(coord1, coord2) {
  const lat = (parseFloat(coord1.lat) - parseFloat(coord2.lat)) ** 2;
  const lng = (parseFloat(coord1.lng) - parseFloat(coord2.lng)) ** 2;
  const dis = Math.sqrt(lat + lng);
  return Math.round((dis * state.EARTH_CIRCUMFERENCE) / 360);
}

function getTimeBetweenTwoCoords(coord1, coord2, averageVelocity) {
  const lat = (parseFloat(coord1.lat) - parseFloat(coord2.lat)) ** 2;
  const lng = (parseFloat(coord1.lng) - parseFloat(coord2.lng)) ** 2;
  const dis = Math.sqrt(lat + lng);
  const AVERAGE_VELOCITY = averageVelocity || state.AVERAGE_VELOCITY;
  return Math.round(
    (dis * state.EARTH_CIRCUMFERENCE)
      / (360 * AVERAGE_VELOCITY * state.KMPERHOUR_TO_MPERSECOND_CONST),
  );
}

function getManhattanDistanceBetweenTwoCoords(coord1, coord2) {
  const lat = Math.abs(parseFloat(coord1.lat) - parseFloat(coord2.lat));
  const lng = Math.abs(parseFloat(coord1.lng) - parseFloat(coord2.lng));
  const dis = lat + lng;
  return Math.round((dis * state.EARTH_CIRCUMFERENCE) / 360);
}

function getManhattanTimeBetweenTwoCoords(coord1, coord2) {
  const lat = Math.abs(parseFloat(coord1.lat) - parseFloat(coord2.lat));
  const lng = Math.abs(parseFloat(coord1.lng) - parseFloat(coord2.lng));
  const dis = lat + lng;
  return Math.round(
    (dis * state.EARTH_CIRCUMFERENCE)
    / (360 * state.AVERAGE_VELOCITY * state.KMPERHOUR_TO_MPERSECOND_CONST),
  );
}

function getDistanceFromZoom(zoom) {
  const zoomToDistance = {
    13: 9000,
    14: 7000,
    15: 5000,
    16: 3500,
    17: 2500,
    18: 2000,
    19: 1000,
    20: 600,
    21: 300,
  };
  return zoomToDistance[zoom] || 15000;
}

function getBaseStatusFieldOfTime(timestamp) {
  const time = moment(timestamp).tz('Asia/Ho_Chi_Minh');
  const hour = time.hour();
  const minute = time.minute();
  if (
    (hour >= 0 && hour <= 5)
    || (hour >= 9 && hour <= 15)
    || (hour >= 19 && hour <= 23)
  ) {
    return `period_${hour}`;
  } if (hour === 24) {
    return 'period_0';
  }
  if (minute >= 30) {
    return `period_${hour}_30`;
  }
  return `period_${hour}`;
}

function getVelocityFromLOS(los) {
  const losToVelocity = {
    A: 35,
    B: 30,
    C: 25,
    D: 20,
    E: 15,
    F: 10,
  };
  return losToVelocity[los] || 45;
}

function getLOSFromVelocity(velocity) {
  if (velocity < 15) {
    return 'F';
  } if (velocity >= 15 && velocity < 20) {
    return 'E';
  } if (velocity >= 20 && velocity < 25) {
    return 'D';
  } if (velocity >= 25 && velocity < 30) {
    return 'C';
  } if (velocity >= 30 && velocity < 35) {
    return 'B';
  }
  return 'A';
}

function velocityToColor(_velocity) {
  let color = '';
  const velocity = parseFloat(_velocity);
  if (velocity < 5) {
    color = '#ff0000';
  } else if (velocity < 15) {
    color = '#ff9900';
  } else if (velocity < 25) {
    color = '#ffcc00';
  } else if (velocity < 35) {
    color = '#ffff00';
  } else if (velocity < 40) {
    color = '#ccff33';
  } else {
    color = '#009900';
  }
  return color;
}

function getAverageVelocityFromTime(timestamp) {
  const time = moment(timestamp).tz('Asia/Ho_Chi_Minh');
  const hour = time.hour();
  if (hour >= 0 && hour < 6) {
    return 35;
  } if (hour >= 6 && hour < 8) {
    return 25;
  } if (hour >= 8 && hour < 9) {
    return 20;
  } if (hour >= 9 && hour < 16) {
    return 30;
  } if (hour >= 16 && hour < 19) {
    return 25;
  }
  return 30;
}

function isExpiredWithTimeFrame(startTime, endTime, timeFrame) {
  return startTime <= endTime && startTime + timeFrame >= endTime;
}
// check if obj has all key belong to allowField and each key has value
// not correct when value is object or array
function isAllowFieldOfObject(obj, allowFields) {
  const ownProps = Object.keys(obj);

  for (let i = 0; i < allowFields.length; i += 1) {
    if (!ownProps.includes(allowFields[i]) || !obj[allowFields[i]]) { return false; }
  }
  return true;
}

function validateBodyOfPublicData(data) {
  const errors = [];
  const allowType = ['rectangle', 'line', 'circle'];
  if (!data.type || !allowType.includes(data.type)) {
    errors.push({
      key: 'type',
      value: {
        ...Reason.invalid,
        message: 'type must in [\'rectangle\', \'line\', \'circle\']',
      },
    });
  }
  if (
    data.type === 'rectangle'
    && (!data.coordinates || data.coordinates.length !== 4)
  ) {
    errors.push({
      key: 'coordinates',
      value: {
        ...Reason.invalid,
        message: 'coordinates of rectangle must have 4 point',
      },
    });
  }
  if (data.type === 'circle') {
    if (!data.coordinates || data.coordinates.length !== 1) {
      errors.push({
        key: 'coordinates',
        value: {
          ...Reason.invalid,
          message: 'coordinates of circle must have 1 point',
        },
      });
    }
    if (!data.radius || data.radius <= 0 || data.radius > 3000) {
      errors.push({
        key: 'radius',
        value: {
          ...Reason.invalid,
          message: 'range of radius is 1 to 3000 meters',
        },
      });
    }

    if (data.coordinates && data.coordinates.length > 0) {
      const { coordinates } = data;
      for (let i = 0; i < coordinates.length; i += 1) {
        if (!Array.isArray(coordinates[i]) || coordinates[i].length !== 2) {
          errors.push({
            key: 'coordinates',
            value: {
              ...Reason.invalid,
              message: 'coordinates must include lat and lng',
            },
          });
          break;
        }
        const lat = coordinates[i][0];
        const lng = coordinates[i][1];
        let err = Validator.checkLatitude(lat);
        if (err) {
          errors.push({
            key: `lat_${i + 1}`,
            value: err,
          });
          err = null;
        }
        err = Validator.checkLongitude(lng);
        if (err) {
          errors.push({
            key: `lng_${i}`,
            value: err,
          });
        }
      }
    }
  }
  return errors;
}

function convertTimestampToDateTime(timestamp, format) {
  return moment(timestamp).tz('Asia/Ho_Chi_Minh').format(format);
}

function addDistanceToCoordinate(lat, lng, dx, dy) {
  const newLat = parseFloat(lat) + (180 / Math.PI) * (dy / state.EARTH_RADIUS);
  const newLng = parseFloat(lng) - ((180 / Math.PI) * (dx / state.EARTH_RADIUS)) / Math.cos(lat);
  return [newLng, newLat];
}

function removeAccents(str) {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function arrayBufferToBuffer(arrayBuffer) {
  const arrayBufferToBufferAsArgument = (buffer) => Buffer.from(buffer);
  const arrayBufferToBufferCycle = (buffer) => {
    const _buffer = Buffer.from(buffer.byteLength);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < _buffer.length; i += 1) {
      _buffer[i] = view[i];
    }
    return _buffer;
  };

  if (Buffer.from(new Uint8Array([1]).buffer)[0] === 1) {
    return arrayBufferToBufferAsArgument(arrayBuffer);
  }
  return arrayBufferToBufferCycle(arrayBuffer);
}

module.exports = {
  timeToPeriod,
  hashPassword,
  comparePassword,
  getDistancePow2BetweenTwoCoords,
  getDistanceFromZoom,
  getDistanceBetweenTwoCoords,
  getTimeBetweenTwoCoords,
  getManhattanDistanceBetweenTwoCoords,
  getManhattanTimeBetweenTwoCoords,
  getBaseStatusFieldOfTime,
  getVelocityFromLOS,
  getAverageVelocityFromTime,
  velocityToColor,
  isExpiredWithTimeFrame,
  isAllowFieldOfObject,
  validateBodyOfPublicData,
  getLOSFromVelocity,
  convertTimestampToDateTime,
  addDistanceToCoordinate,
  removeAccents,
  sleep,
  arrayBufferToBuffer,
};
