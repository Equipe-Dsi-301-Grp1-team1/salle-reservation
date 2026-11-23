'use strict';
const router = require('express').Router();
const c = require('../controllers/payment.controller');

router.get('/me', c.listMine);
router.post('/simulate/:sessionId', c.simulate);

module.exports = router;
