'use strict';
const cron = require('node-cron');
const logger = require('../utils/logger');
const bookingService = require('../services/booking.service');

module.exports = () =>
  cron.schedule('*/15 * * * *', async () => {
    try {
      const n = await bookingService.expireDueBookings(new Date());
      if (n) logger.info(`${n} réservation(s) expirée(s)`);
    } catch (err) {
      logger.error('Tâche expireBookings en échec', err);
    }
  });
