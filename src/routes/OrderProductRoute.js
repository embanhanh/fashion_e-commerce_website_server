var express = require('express')
var router = express.Router()
const orderProductController = require('../controllers/OrderProductController')

router.post('/create', orderProductController.createOrder)
router.get('/', orderProductController.getAllOrder)
router.put('/update-status-many', orderProductController.updateOrderStatusMany)
router.get('/:order_id', orderProductController.getOrderById)

module.exports = router
