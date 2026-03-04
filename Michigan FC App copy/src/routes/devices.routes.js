const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upsertToken, deviceTokenSchema } = require('../controllers/devices.controller');

const router = Router();
router.use(authenticate);

router.post('/token', validate(deviceTokenSchema), upsertToken);

module.exports = router;
