const { Reason, ErrorType, BaseError } = require('../../core/error');
const { ResponseFactory } = require('../../core/response');
const appVersionService = require('./app-version.service');

/**
 * Get App Version
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function getAppVersion(req, res, next) {
  try {
    const appVersionInfo = await appVersionService.findOne({ id: req.params.id });
    if (!appVersionInfo) {
      new BaseError(ErrorType.badRequest)
        .addError('App Version', Reason.invalid)
        .send(res);
      return;
    }
    ResponseFactory.success(appVersionInfo).send(res);
  } catch (error) {
    next(error);
  }
}

/**
 * Update App Version
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function updateAppVersion(req, res, next) {
  try {
    const appVersionInfo = await appVersionService.updateOneOrCreate(
      { id: req.body.id },
      req.body,
    );
    if (!appVersionInfo) {
      new BaseError(ErrorType.badRequest)
        .addError('App Version', Reason.invalid)
        .send(res);
      return;
    }
    ResponseFactory.success(req.body).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAppVersion,
  updateAppVersion,
};
