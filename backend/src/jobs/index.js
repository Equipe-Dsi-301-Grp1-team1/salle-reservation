const cron = require('node-cron');
const { expireBookings } = require('./expireBookings');

let started = false;

function startJobs() {
  if (started) {
    return;
  }
  started = true;

  cron.schedule('*/15 * * * *', async function () {
    try {
      const count = await expireBookings();
      if (count > 0) {
        console.log(count + ' réservation(s) expirée(s).');
      }
    } catch (error) {
      console.error('Erreur de la tâche d\'expiration :', error.message);
    }
  });
}

module.exports = { startJobs, expireBookings };
