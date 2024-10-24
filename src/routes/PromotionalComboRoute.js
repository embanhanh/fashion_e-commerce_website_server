const express = require('express')
const router = express.Router()
const promotionalComboController = require('../controllers/PromotionalComboController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

router.get('/', promotionalComboController.getAllPromotionalCombos)
router.post('/create', authenticateToken, promotionalComboController.createPromotionalCombo)

module.exports = router
