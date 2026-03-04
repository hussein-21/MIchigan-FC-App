const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { sendNotification, getUserNotifications, sendNotificationSchema } = require('../controllers/notifications.controller');

const router = Router();
router.use(authenticate);

router.post('/send', authorize('DIRECTOR'), validate(sendNotificationSchema), sendNotification);
router.get('/user/:id', getUserNotifications);

module.exports = router;
