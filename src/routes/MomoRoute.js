const express = require('express')
const router = express.Router()
const momoController = require('../controllers/MomoController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

router.post('/payment', authenticateToken, momoController.createPaymentUrl)
router.post('/payment-from-guest', momoController.createPaymentUrlFromGuest)
router.post('/callback', momoController.callback)
router.post('/callback-from-guest', momoController.callbackFromGuest)
router.post('/check-status-transaction', momoController.checkStatusTransaction)

module.exports = router
