const express = require('express');

const router = express.Router();
const controllers = require('../controllers/admin-traffic-status-config.controller');
const middleware = require('../../../middlewares/auth');

router.get('/traffic-status-config', middleware.isAuthorizedAdminUtraffic, controllers.getAdminTrafficStatusConfig);
// eslint-disable-next-line max-len
router.delete('/traffic-status-config/:id', middleware.isAuthorizedAdminUtraffic, controllers.deleteAdminTrafficStatusConfig);
router.put('/traffic-status-config/:id', middleware.isAuthorizedAdminUtraffic, controllers.inactiveAdminTrafficConfig);

module.exports = router;
