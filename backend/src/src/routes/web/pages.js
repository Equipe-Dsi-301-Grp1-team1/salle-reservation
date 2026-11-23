const express = require('express');
const pages = require('../../controllers/web/pages');
const { validateRoom } = require('../../middlewares/validators');
const upload = require('../../middlewares/upload');

const router = express.Router();

router.param('id', (req, res, next, id) => {
  if (/^[0-9a-f]{24}$/i.test(id)) return next();
  next('route');
});

router.get('/', (req, res) => res.redirect('/rooms'));

router.get('/rooms', pages.webListRooms);
router.post('/rooms', validateRoom, pages.webCreateRoom);
router.get('/rooms/new', pages.webNewForm);
router.get('/rooms/:id/edit', pages.webEditForm);
router.post('/rooms/:id', validateRoom, pages.webUpdateRoom);
router.post('/rooms/:id/delete', pages.webDeleteRoom);
router.post('/rooms/:id/toggle-publish', pages.webTogglePublish);
router.post('/rooms/:id/photos', upload.array('photos', 5), pages.webAddPhotos);
router.post('/rooms/:id/photos/:file/delete', pages.webDeletePhoto);

module.exports = router;
