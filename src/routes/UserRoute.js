var express = require('express')
var router = express.Router()

const userController = require('../controllers/UserController')

router.post('/login', userController.login)
router.post('/register', userController.register)

module.exports = router
