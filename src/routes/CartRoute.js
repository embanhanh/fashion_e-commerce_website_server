const express = require('express')
const router = express.Router()
const cartController = require('../controllers/CartController')

router.get('/', cartController.getCart)
router.post('/add', cartController.addToCart)
router.put('/update/:itemId', cartController.updateCartItem)
router.delete('/remove/:itemId', cartController.removeCartItem)
module.exports = router
