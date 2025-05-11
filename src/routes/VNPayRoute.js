const express = require('express')
const router = express.Router()
const vnpayController = require('../controllers/VNPayController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')


router.post('/create_payment_url', authenticateToken, vnpayController.createPaymentUrl)
router.post('/create_payment_url_from_guest', vnpayController.createPaymentUrlFromGuest)
router.post('/check_transaction_status', authenticateToken, vnpayController.checkTransactionStatus)
router.post('/refund', authenticateToken, vnpayController.refund)
router.get('/vnpay_return', vnpayController.vnpayReturn)
router.get('/vnpay_ipn', vnpayController.vnpayIPN)
router.get('/vnpay_return_from_guest', vnpayController.vnpayReturnFromGuest)

module.exports = router
