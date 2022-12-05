const jwt = require('jsonwebtoken');
const { BaseError, ErrorType } = require('./error');

function createJwtToken(data) {
  const key = process.env.APP_SECRET_KEY || '23456';
  try {
    return jwt.sign(data, key);
  } catch (error) {
    throw new BaseError({
      ...ErrorType.internalServerError,
      message: 'Jwt token error',
      debugError: error,
    });
  }
}

function getDataFromJwtToken(token) {
  const key = process.env.APP_SECRET_KEY || '23456';
  try {
    return jwt.verify(token, key);
  } catch (error) {
    throw new BaseError({
      ...ErrorType.unauthorized,
      message: 'Jwt token error',
      debugError: error,
    });
  }
}

module.exports = {
  createJwtToken,
  getDataFromJwtToken,
};
