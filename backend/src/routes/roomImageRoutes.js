const express = require('express');
const controller = require('../controllers/roomImageController');
const { uploadImages } = require('../middlewares/uploadImages');

const apiRouter = express.Router();

apiRouter.use((req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Accès refusé : agent non identifié.' });
  }
  next();
});

apiRouter.get('/rooms/:id/photos', controller.list);
apiRouter.post('/rooms/:id/photos', uploadImages, controller.upload);
apiRouter.delete('/rooms/:id/photos/:fileName', controller.remove);

apiRouter.use((error, req, res, next) => {
  res.status(error.status || 500).json({ message: error.message });
});

const viewRouter = express.Router();

viewRouter.get('/rooms/:roomId/photos', controller.showPage);
viewRouter.post('/rooms/:roomId/photos', uploadImages, controller.uploadFromPage);
viewRouter.post('/rooms/:roomId/photos/:fileName/delete', controller.removeFromPage);

viewRouter.use((error, req, res, next) => {
  const match = req.path.match(/^\/rooms\/([^/]+)\/photos/);
  if (!match) {
    return res.status(error.status || 500).send(error.message);
  }
  const url = '/agent/rooms/' + match[1] + '/photos?agentId=' + encodeURIComponent(req.agentId);
  res.redirect(url + '&error=' + encodeURIComponent(error.message));
});
module.exports = { apiRouter, viewRouter };
