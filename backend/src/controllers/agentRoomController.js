const Room = require('../models/Room');

// US-07 & US-11 : Créer une salle (T-13, T-25)
exports.createRoom = async (req, res) => {
  try {
    const { name, description, address, capacity, pricePerHour, equipments } = req.body || {};

    const room = await Room.create({
      agentId: req.user.id,
      name,
      description,
      address,
      capacity,
      pricePerHour,
      equipments: equipments || []
    });

    res.status(201).json({ message: 'Salle créée avec succès.', room });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erreur lors de la création de la salle.' });
  }
};

// US-08 : Lister uniquement les salles de l'agent connecté (T-16)
exports.getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ agentId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de vos salles.' });
  }
};

// Détail d'une salle (pour préremplir le formulaire de modification T-20)
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, agentId: req.user.id });
    if (!room) {
      return res.status(404).json({ message: 'Salle introuvable ou accès non autorisé.' });
    }
    res.status(200).json(room);
  } catch (error) {
    res.status(400).json({ message: 'Identifiant de salle invalide.' });
  }
};

// US-09 & US-11 : Modifier une salle avec contrôle du propriétaire (T-19)
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, agentId: req.user.id });
    if (!room) {
      return res.status(404).json({ message: 'Salle introuvable ou accès non autorisé.' });
    }

    const { name, description, address, capacity, pricePerHour, equipments } = req.body || {};
    if (name !== undefined) room.name = name;
    if (description !== undefined) room.description = description;
    if (address !== undefined) room.address = address;
    if (capacity !== undefined) room.capacity = capacity;
    if (pricePerHour !== undefined) room.pricePerHour = pricePerHour;
    if (equipments !== undefined) room.equipments = equipments;

    await room.save();
    res.status(200).json({ message: 'Salle mise à jour avec succès.', room });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erreur lors de la modification.' });
  }
};

// US-10 : Supprimer une salle (T-22)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, agentId: req.user.id });
    if (!room) {
      return res.status(404).json({ message: 'Salle introuvable ou accès non autorisé.' });
    }

    await room.deleteOne();
    res.status(200).json({ message: 'Salle supprimée avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression de la salle.' });
  }
};

exports.getAllowedEquipments = (req, res) => {
  res.status(200).json(Room.ALLOWED_EQUIPMENTS);
};