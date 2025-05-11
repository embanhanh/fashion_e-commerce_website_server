const express = require('express')
const router = express.Router()
const zaloPayController = require('../controllers/ZaloPayController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')


router.post('/create_payment_url', authenticateToken, zaloPayController.createZaloPayPaymentUrl);
router.post('/zalo_return', zaloPayController.callbackZaloPay);
router.post('/query_order_status', authenticateToken, zaloPayController.queryOrderStatus);
router.post('/refund', authenticateToken, zaloPayController.refundOrder);
router.post('/query_refund_status', authenticateToken, zaloPayController.queryRefundOrderStatus);

module.exports = router
