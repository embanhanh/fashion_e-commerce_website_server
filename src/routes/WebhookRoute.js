const express = require('express')
const router = express.Router()
const webhookController = require('../controllers/webhookController')

router.post('/product', webhookController.productWebhook)

module.exports = router
