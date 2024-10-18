var express = require('express')
var router = express.Router()
const { authenticateToken } = require('../middlewares/AuthMiddleware')
const orderProductController = require('../controllers/OrderProductController')

router.post('/create', authenticateToken, orderProductController.createOrder)
router.get('/', authenticateToken, orderProductController.getAllOrder)
// router.get('/:id', orderProductController.getOrderProductById)
// router.put('/:id', orderProductController.updateOrderProduct)

module.exports = router
