const express = require('express');

const router = express.Router();
const controller = require('../controllers/user');
const middleware = require('../../../middlewares/auth');

router.post('/update-user-info', middleware.isAuthorizedUser, controller.user.updateUserInfo);
router.get('/get-user-info', middleware.isAuthorizedUser, controller.user.getUserInfo);

module.exports = router;
