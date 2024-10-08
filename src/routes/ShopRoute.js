const express = require('express')
const router = express.Router()
const shopController = require('../controllers/ShopController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

router.get('/', authenticateToken, shopController.getShop)
module.exports = router
