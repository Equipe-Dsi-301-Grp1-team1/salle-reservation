const mongoose = require('mongoose');

const creneauSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salle', required: true },
    date: { type: Date, required: true },
    timeStart: { type: String, required: true },
    timeEnd: { type: String, required: true },
    status: { type: String, enum: ['DISPONIBLE', 'RESERVE'], default: 'DISPONIBLE' },
  },
  { timestamps: true }
);

creneauSchema.index({ roomId: 1, date: 1, timeStart: 1 }, { unique: true });

module.exports = mongoose.model('Creneau', creneauSchema);