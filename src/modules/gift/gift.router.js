const { Router } = require('express');
const controller = require('./gift.controller');

const router = new Router();
const middleware = require('../../middlewares/auth');

router.get('/gift/getallgift', middleware.isAuthorizedUser, controller.getAllGift);
router.post('/gift/checkgift', middleware.isAuthorizedUser, controller.checkGift);

module.exports = router;
