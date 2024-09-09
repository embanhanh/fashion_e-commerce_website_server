var express = require('express')
var router = express.Router()
const { authenticateToken } = require('../middlewares/AuthMiddleware')

const userController = require('../controllers/UserController')

router.post('/login', userController.login)
router.post('/register', userController.register)
router.get('/account/profile', authenticateToken, userController.getProfileUser)
router.get('/account/address', authenticateToken, userController.getAddressUser)
router.get('/account/payment', authenticateToken, userController.getPaymentUser)
router.get('/purchase', authenticateToken, userController.getPurchase)

module.exports = router
