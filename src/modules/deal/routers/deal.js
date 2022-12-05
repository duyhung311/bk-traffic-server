const express = require('express');

const router = express.Router();
const controller = require('../controllers/deal');
const middleware = require('../../../middlewares/auth');

router.post('/finduser', controller.deal.findUser);
router.get('/getmessageauthentication', middleware.isAuthorizedUser, controller.deal.getMessageAuthentication);
router.post('/confirmauthentication', middleware.isAuthorizedUser, controller.deal.confirmAuthentication);
router.get('/getdealvoucher', middleware.isAuthorizedUser, controller.deal.getDealVoucher);
router.get('/getreportvoucher', middleware.isAuthorizedUser, controller.deal.getReportDeal);
router.post('/confirmqrcode', middleware.isAuthorizedUser, controller.deal.confirmQRCode);
// router.get('/getdetailmyvoucher',middleware.isAuthorizedUser,controller.voucher.getDetailMyVoucher);
module.exports = router;
