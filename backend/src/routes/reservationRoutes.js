const router = require('express').Router();

router.use('/api', require('./bookingRoutes'));

module.exports = router;
