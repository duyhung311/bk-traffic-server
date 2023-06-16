const express = require('express');
const controller = require('../controllers/segment-report');
const middleware = require('../../../middlewares/auth');

const router = express.Router();

router.get('/current-reports', controller.user.findCurrentReportsByLocation);
router.get('/reports', controller.user.findReportsBySegment);
router.get('/report-detail', controller.user.getReportDetail);
router.get('/fake-report-status', controller.user.getFakeReportStatus);

router.post('/start-fake-report', controller.user.startFakeReport);
router.post('/here', middleware.isAnyUser, controller.user.reportCurrentLocation);
router.post('/user-report', middleware.isAnyUser, controller.user.reportByForm);
router.post('/user-multi-report', middleware.isAnyUser, controller.user.multiReportByForm);
router.post('/user-fast-report', middleware.isAnyUser, controller.user.fastReportByForm);

module.exports = router;
