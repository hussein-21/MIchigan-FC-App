const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { createEvent, listEvents, listEventsByTeam, createEventSchema } = require('../controllers/events.controller');

const router = Router();
router.use(authenticate);

router.post('/', authorize('DIRECTOR'), validate(createEventSchema), createEvent);
router.get('/', listEvents);
router.get('/team/:teamId', listEventsByTeam);

module.exports = router;
