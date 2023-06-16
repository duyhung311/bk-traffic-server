const { Router } = require('express');
const controller = require('./evaluation.controller');

const router = new Router();
const middleware = require('../../middlewares/auth');

router.get('/evaluation/me', middleware.isAuthorizedUser, controller.user.getMyEvaluations);
router.post('/evaluation/add', middleware.isAuthorizedUser, controller.user.addOne);

module.exports = router;
