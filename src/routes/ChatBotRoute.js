var express = require('express')
var router = express.Router()
const { authenticateToken, authorizeRole } = require('../middlewares/AuthMiddleware')
// const upload = require('../middlewares/uploadMiddleware')
const geminiController = require('../controllers/GeminiController')

router.get('/get-answer/:question', authenticateToken, geminiController.getAnswer)

module.exports = router
