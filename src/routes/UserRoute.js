var express = require('express')
var router = express.Router()
const { authenticateToken } = require('../middlewares/AuthMiddleware')

const userController = require('../controllers/UserController')

router.post('/login/facebook', userController.loginWithFirebase)
router.post('/login/google', userController.loginWithFirebase)
router.post('/login', userController.login)
router.post('/refresh-token', userController.refreshToken)
router.post('/register', userController.register)
router.get('/account/profile', authenticateToken, userController.getProfileUser)
router.put('/account/profile/edit', authenticateToken, userController.updateProfileUser)
router.post('/account/address/create', authenticateToken, userController.createAddressUser)
router.put('/account/address/update/:id', authenticateToken, userController.updateAddressUser)
router.delete('/account/address/delete/:id', authenticateToken, userController.deleteAddressUser)
router.put('/account/address/setdefault/:id', authenticateToken, userController.setDefaultAddressUser)
router.get('/account/address', authenticateToken, userController.getAddressUser)
router.get('/account/payment', authenticateToken, userController.getPaymentUser)
router.get('/purchase/order/:id', authenticateToken, userController.getOrderDetail)
router.get('/purchase', authenticateToken, userController.getPurchase)

module.exports = router
