const { Router } = require('express');
const controller = require('./voh.controller');

const router = new Router();
const authMid = require('../../middlewares/auth');

router.get('/voh/find-addresses', controller.user.findAddressesFromCoords);
router.post('/voh/add-addresses', authMid.isAuthorizedAdmin, controller.user.addVohAddresses);

router.get('/voh/get-news', controller.getNewsFromVOH); // isAuthorizedUser

module.exports = router;
