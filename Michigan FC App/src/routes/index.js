const { Router } = require('express');

const router = Router();

router.use('/auth',          require('./auth.routes'));
router.use('/users',         require('./users.routes'));
router.use('/players',       require('./players.routes'));
router.use('/events',        require('./events.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/devices',       require('./devices.routes'));

module.exports = router;
