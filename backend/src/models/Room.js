const { Schema, model } = require('mongoose');

const ALLOWED_EQUIPMENTS = [
  'wifi',
  'videoprojecteur',
  'climatisation',
  'sonorisation',
  'tableau_blanc',
  'parking',
  'cuisine'
];

const schema = new Schema({
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
  name: { type: String, required: [true, 'Le nom est obligatoire.'], trim: true },
  description: { type: String, required: [true, 'La description est obligatoire.'], trim: true },
  address: { type: String, required: [true, "L'adresse est obligatoire."], trim: true },
  capacity: { type: Number, required: [true, 'La capacité est obligatoire.'], min: [1, 'La capacité doit être supérieure à 0.'] },
  pricePerHour: { type: Number, required: [true, 'Le prix par heure est obligatoire.'], min: [0.01, 'Le prix doit être supérieur à 0.'] },
  equipments: {
    type: [String],
    default: [],
    validate: {
      validator: (items) => items.every((item) => ALLOWED_EQUIPMENTS.includes(item)),
      message: 'Un ou plusieurs équipements sont invalides.'
    }
  },
  photos: {
    type: [String],
    default: [],
    validate: {
      validator: (items) => items.length <= 5,
      message: 'Une salle peut avoir 5 photos au maximum.'
    }
  },
  isPublished: { type: Boolean, default: true },
  ratingAverage: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

schema.index({ isPublished: 1, capacity: 1, pricePerHour: 1 });

const Room = model('Room', schema);
Room.ALLOWED_EQUIPMENTS = ALLOWED_EQUIPMENTS;

module.exports = Room;