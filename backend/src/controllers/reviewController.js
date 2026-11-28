const reviewService = require('../services/reviewService');

async function create(req, res) {
  try {
    const review = await reviewService.createReview(req.user.id, req.params.id, req.body);
    res.status(201).json({
      message: 'Merci, votre avis a bien été enregistré.',
      review: review,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function list(req, res) {
  try {
    const result = await reviewService.listRoomReviews(req.params.roomId);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { create, list };
