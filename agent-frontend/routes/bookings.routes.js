'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/bookings.controller');
const asyncHandler = require('../utils/asyncHandler');

router.get('/bookings', asyncHandler(ctrl.index));
router.get('/bookings/:id', asyncHandler(ctrl.show));
router.post('/bookings/:id/validate', asyncHandler(ctrl.validate));
router.post('/bookings/:id/reject', asyncHandler(ctrl.reject));

module.exports = router;
