const router = require('express').Router();
const { agentOnly } = require('../middlewares/identify');

router.use('/api', require('./bookingRoutes'));
router.use('/api', require('./paymentRoutes'));
router.use('/api/agent', require('./agentBookingRoutes'));
router.use('/agent', agentOnly, require('./agentBookingViewRoutes'));

module.exports = router;
