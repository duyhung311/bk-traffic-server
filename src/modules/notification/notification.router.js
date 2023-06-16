const express = require('express');

const router = express.Router();
const controller = require('./notification.controller');
const middleware = require('../../middlewares/auth');

router.post('/notification/update-current-location', middleware.isAuthorizedUser, controller.updateCurrentLocation);
router.post('/notification/notice-to-users', controller.noticeToUsers);

module.exports = router;
