const formidable = require('formidable');
const _ = require('lodash');
const { Reason, ErrorType, BaseError } = require('../../core/error');
const { ResponseFactory } = require('../../core/response');
const Setting = require('../../config/setting');

/**
 * Upload file
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
function uploadFile(req, res, next) {
  const form = new formidable.IncomingForm();

  // Image folder
  form.uploadDir = Setting.UPLOAD_FILE_PATH;
  form.keepExtensions = false;
  form.maxFileSize = 5 * 1024 * 1024;
  console.log('test');
  form.parse(req, async (err, fields, files) => {
    if (err) {
      next(err);
      return;
    }
    try {
      const { file } = files;
      if (!file || !file.path) {
        new BaseError(ErrorType.badRequest).send(res);
        return;
      }

      const uri = Setting.IMAGE_HOST + Setting.UPLOAD_FILE_LINK + file.path.replace(Setting.UPLOAD_FILE_PATH, '');

      ResponseFactory.success(uri).send(res);
    } catch (err) {
      next(err);
    }
  });
}

module.exports = {
  user: {
    uploadFile,
  },
};
