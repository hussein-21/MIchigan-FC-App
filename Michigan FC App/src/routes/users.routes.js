const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { listUsers, getUser, updateUser, updateUserSchema } = require('../controllers/users.controller');

const router = Router();
router.use(authenticate);

router.get('/',    authorize('DIRECTOR'), listUsers);
router.get('/:id', getUser);    // self-check inside controller
router.put('/:id', validate(updateUserSchema), updateUser);

module.exports = router;
