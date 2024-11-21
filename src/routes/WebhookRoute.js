const express = require('express')
const router = express.Router()
const webhookController = require('../controllers/WebhookController')

router.post('/product', webhookController.productWebhook)

module.exports = router
