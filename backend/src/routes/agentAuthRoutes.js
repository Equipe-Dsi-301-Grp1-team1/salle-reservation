const express = require('express');
const router = express.Router();
const agentAuthController = require('../controllers/agentAuthController');

router.post('/login', agentAuthController.login);
router.post('/logout', agentAuthController.logout);

module.exports = router;
