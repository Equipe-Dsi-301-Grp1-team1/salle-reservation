'use strict';
const cron = require('node-cron');
const logger = require('../utils/logger');
const env = require('../config/env');
const bookingService = require('../services/booking.service');
const { todayString } = require('../utils/dates');

module.exports = () =>
  cron.schedule(
    '0 1 * * *',
    async () => {
      try {
        const n = await bookingService.completePastBookings(todayString());
        if (n) logger.info(`${n} réservation(s) terminée(s)`);
      } catch (err) {
        logger.error('Tâche completeBookings en échec', err);
      }
    },
    { timezone: env.APP_TIMEZONE },
  );
