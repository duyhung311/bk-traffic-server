const { Router } = require('express');
const controller = require('./feedback.controller');

const router = new Router();
const middleware = require('../../middlewares/auth');

router.post('/feedback/create', middleware.isAuthorizedUser, controller.createFeedback);
router.get('/feedback/all', controller.getAllFeedbacks);
router.post('/feedback/update', controller.replyFeedback);

module.exports = router;
