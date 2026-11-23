const express = require('express');
const router = express.Router();
const roomCtrl = require('../controllers/agentRoomController');

// Remplace et décommente les deux lignes ci-dessous une fois que tu as vérifié
// le nom exact du middleware d'authentification dans ton dossier middlewares/ :
// const { verifyToken, isAgent } = require('../middlewares/authMiddleware');
// router.use(verifyToken, isAgent);

// Route utilitaire : récupérer la liste fixe des équipements autorisés (US-11 / T-25)
router.get('/equipments', roomCtrl.getAllowedEquipments);

router.use((req, res, next) => {
  if (!req.user) {
    req.user = { id: '673f1234567890abcdef1234' };
  }
  next();
});

// US-07 : Créer une salle (T-13)
router.post('/rooms', roomCtrl.createRoom);

// US-08 : Lister uniquement les salles de l'agent connecté (T-16)
router.get('/rooms', roomCtrl.getMyRooms);

// US-08 / US-09 : Récupérer les détails d'une salle (utile pour préremplir le formulaire T-20)
router.get('/rooms/:id', roomCtrl.getRoomById);

// US-09 : Modifier les informations d'une salle (T-19)
router.put('/rooms/:id', roomCtrl.updateRoom);

// US-10 : Supprimer une salle (T-22)
router.delete('/rooms/:id', roomCtrl.deleteRoom);

module.exports = router;