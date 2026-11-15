const { Schema, model } = require('mongoose');
const schema = new Schema({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  date: { type: Date, required: true },
  timeStart: { type: String, required: true }, 
  timeEnd: { type: String, required: true },   
  status: { type: String, enum: ['DISPONIBLE', 'RESERVE', 'BLOQUE'], default: 'DISPONIBLE' },
  reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', default: null },
});
schema.index({ roomId: 1, date: 1, timeStart: 1 }, { unique: true });
module.exports = model('Creneau', schema);