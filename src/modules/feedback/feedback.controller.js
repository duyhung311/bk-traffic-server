const { Reason, ErrorType, BaseError } = require('../../core/error');
const { ResponseFactory } = require('../../core/response');
const feedbackService = require('./feedback.service');

/**
 * Get All Feedbacks
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function getAllFeedbacks(req, res, next) {
  try {
    const feedbacks = await feedbackService.findMany({});
    if (!feedbacks) {
      new BaseError(ErrorType.badRequest)
        .addError('Feedback', Reason.invalid)
        .send(res);
      return;
    }
    ResponseFactory.success(feedbacks).send(res);
  } catch (error) {
    next(error);
  }
}

/**
 * Create Feedback
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function createFeedback(req, res, next) {
  try {
    const data = {
      user: req.user._id,
      message: req.body.message,
    };
    const result = await feedbackService.insertOne(data);
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

/**
 * Update Feedback
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function replyFeedback(req, res, next) {
  try {
    await feedbackService.updateOne(
      { _id: req.body._id },
      { response: req.body.response },
    );
    const result = await feedbackService.findOne({ _id: req.body._id });
    ResponseFactory.success(result).send(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllFeedbacks,
  replyFeedback,
  createFeedback,
};
