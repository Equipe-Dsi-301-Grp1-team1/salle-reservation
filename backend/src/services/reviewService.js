const Review = require('../models/Review');
const Room = require('../models/Room');
const { User } = require('../models/User');
const { STATUS } = require('../constants/bookingStatus');
const bookingService = require('./bookingService');

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function createReview(clientId, bookingId, data) {
  const booking = await bookingService.getClientBooking(clientId, bookingId);

  if (booking.status !== STATUS.TERMINEE) {
    throw makeError(409, 'Vous pourrez laisser un avis après l\'événement.');
  }

  const already = await Review.findOne({ reservationId: booking._id });
  if (already) {
    throw makeError(409, 'Vous avez déjà laissé un avis pour cette réservation.');
  }

  const rating = Number(data.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw makeError(400, 'La note doit être un nombre entier entre 1 et 5.');
  }

  const comment = String(data.comment || '').trim();
  if (comment.length < 10) {
    throw makeError(400, 'Le commentaire doit contenir au moins 10 caractères.');
  }
  if (comment.length > 500) {
    throw makeError(400, 'Le commentaire ne doit pas dépasser 500 caractères.');
  }

  const client = await User.findById(clientId).select('name');
  const roomId = booking.roomId._id;

  const review = await Review.create({
    roomId: roomId,
    clientId: clientId,
    reservationId: booking._id,
    clientName: client ? client.name : 'Client',
    rating: rating,
    comment: comment,
  });

  const reviews = await Review.find({ roomId: roomId });
  let sum = 0;
  reviews.forEach(function (item) {
    sum += item.rating;
  });
  const average = Math.round((sum / reviews.length) * 10) / 10;

  await Room.updateOne(
    { _id: roomId },
    { ratingAverage: average, reviewCount: reviews.length }
  );

  return review;
}

module.exports = { createReview };
