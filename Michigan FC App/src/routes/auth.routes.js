const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { register, login, registerSchema, loginSchema } = require('../controllers/auth.controller');

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login',    validate(loginSchema),    login);

module.exports = router;
