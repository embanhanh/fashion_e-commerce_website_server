var express = require('express')
var router = express.Router()
const { authenticateToken } = require('../middlewares/AuthMiddleware')

const userController = require('../controllers/UserController')

router.post('/login', userController.login)
router.post('/register', userController.register)
router.get('/:user_id', authenticateToken, userController.getUserById)

module.exports = router
