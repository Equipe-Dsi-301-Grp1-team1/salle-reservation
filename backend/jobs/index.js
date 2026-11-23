'use strict';
const logger = require('../utils/logger');

function start() {
  if (process.env.NODE_ENV === 'test') return;
  require('./expireBookings')();
  require('./completeBookings')();
  logger.info('Tâches planifiées démarrées (expiration /15 min, clôture 01h00)');
}

module.exports = { start };
