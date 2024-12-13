const express = require('express')
const router = express.Router()
const promotionalComboController = require('../controllers/PromotionalComboController')
const { authenticateToken, authorizeRole } = require('../middlewares/AuthMiddleware')

router.get('/promotional-combos-active', promotionalComboController.getActivePromotionalCombos)
router.get('/:combo_id', promotionalComboController.getPromotionalComboById)
router.post('/create', authenticateToken, authorizeRole(['admin']), promotionalComboController.createPromotionalCombo)
router.put('/edit/:combo_id', authenticateToken, authorizeRole(['admin']), promotionalComboController.updatePromotionalCombo)
router.post('/delete-many', authenticateToken, authorizeRole(['admin']), promotionalComboController.deleteManyPromotionalCombos)
router.get('/get-by-product/:productId', promotionalComboController.getPromotionalComboByProductId)
router.get('/', promotionalComboController.getAllPromotionalCombos)

module.exports = router
