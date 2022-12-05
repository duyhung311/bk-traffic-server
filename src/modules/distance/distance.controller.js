const { Reason, ErrorType, BaseError } = require('../../core/error');
const { ResponseFactory } = require('../../core/response');
const distanceService = require('./distance.service');

/**
 * Get Distance
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function getDistance(req, res, next) {
  try {
    const distanceInfo = await distanceService.findOne({ user: req.user._id });
    if (!distanceInfo) {
      new BaseError(ErrorType.badRequest)
        .addError('distance', Reason.invalid)
        .send(res);
      return;
    }
    ResponseFactory.success(distanceInfo.distance).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDistance,
};
