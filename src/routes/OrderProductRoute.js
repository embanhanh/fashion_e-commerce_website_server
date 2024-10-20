var express = require('express')
var router = express.Router()
const { authenticateToken } = require('../middlewares/AuthMiddleware')
const orderProductController = require('../controllers/OrderProductController')

router.post('/create', orderProductController.createOrder)
router.get('/', orderProductController.getAllOrder)
router.put('/update-status-many', orderProductController.updateOrderStatusMany)
// router.get('/:id', orderProductController.getOrderProductById)
// router.put('/:id', orderProductController.updateOrderProduct)

module.exports = router
