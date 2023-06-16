const Type = require('./type');
const BaseError = require('./base-error');

module.exports = {
  badRequest() {
    return new BaseError(Type.badRequest);
  },
  conflict() {
    return new BaseError(Type.conflict);
  },
};
