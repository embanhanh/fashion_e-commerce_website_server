const express = require('express')
const router = express.Router()
const momoController = require('../controllers/MomoController')

router.post('/payment', momoController.createPaymentUrl)
router.post('/callback', momoController.callback)
router.post('/check-status-transaction', momoController.checkStatusTransaction)

module.exports = router
