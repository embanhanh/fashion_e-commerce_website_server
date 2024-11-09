const express = require('express')
const router = express.Router()
const promotionalComboController = require('../controllers/PromotionalComboController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

router.get('/:combo_id', promotionalComboController.getPromotionalComboById)
router.post('/create', authenticateToken, promotionalComboController.createPromotionalCombo)
router.put('/edit/:combo_id', authenticateToken, promotionalComboController.updatePromotionalCombo)
router.post('/delete-many', authenticateToken, promotionalComboController.deleteManyPromotionalCombos)
router.get('/', promotionalComboController.getAllPromotionalCombos)

module.exports = router
