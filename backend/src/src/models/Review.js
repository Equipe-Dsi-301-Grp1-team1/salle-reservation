const { Schema, model } = require('mongoose');
module.exports = model('Review', new Schema({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
  clientName: String,       // snapshot
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, minlength: 10 },
}, { timestamps: true }));