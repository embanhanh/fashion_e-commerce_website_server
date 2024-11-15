const express = require('express')
const router = express.Router()
const shopController = require('../controllers/ShopController')
const { authenticateToken, authorizeRole } = require('../middlewares/AuthMiddleware')

router.put('/edit', authenticateToken, authorizeRole(['admin']), shopController.updateShop)
router.get('/', shopController.getShop)
router.post('/create', authenticateToken, authorizeRole(['admin']), shopController.createShop)
module.exports = router
