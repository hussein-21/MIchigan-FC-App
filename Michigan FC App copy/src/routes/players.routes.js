const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createPlayer, getPlayer, getPlayersByParent, createPlayerSchema } = require('../controllers/players.controller');

const router = Router();
router.use(authenticate);

router.post('/', validate(createPlayerSchema), createPlayer);
router.get('/parent/:parentId', getPlayersByParent);
router.get('/:id', getPlayer);

module.exports = router;
