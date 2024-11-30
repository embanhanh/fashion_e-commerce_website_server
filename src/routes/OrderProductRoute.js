var express = require('express')
var router = express.Router()
const orderProductController = require('../controllers/OrderProductController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

router.post('/create', authenticateToken, orderProductController.createOrder)
router.post('/create-from-guest', orderProductController.createOrderFromGuest)
router.get('/', authenticateToken, orderProductController.getAllOrder)
router.put('/update-status-many', authenticateToken, orderProductController.updateOrderStatusMany)
router.put('/update/:order_id', authenticateToken, orderProductController.updateOrder)
router.get('/:user_id', authenticateToken, orderProductController.getOrdersByUserId)
router.get('/:order_id', authenticateToken, orderProductController.getOrderById)

module.exports = router
