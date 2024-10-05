const express = require('express')
const router = express.Router()
const cartController = require('../controllers/CartController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

router.get('/', authenticateToken, cartController.getCart)
router.post('/add', authenticateToken, cartController.addToCart)
router.put('/update/:itemId', authenticateToken, cartController.updateCartItem)
router.delete('/remove/:itemId', authenticateToken, cartController.removeCartItem)
module.exports = router
