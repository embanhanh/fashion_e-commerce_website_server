const express = require('express')
const router = express.Router()
const voucherController = require('../controllers/VoucherController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

router.get('/get/:voucherId', voucherController.getVoucherById)
router.post('/create', authenticateToken, voucherController.createVoucher)
router.put('/edit/:voucherId', authenticateToken, voucherController.updateVoucher)
router.delete('/remove/:voucherId', authenticateToken, voucherController.deleteVoucher)
router.post('/remove-many', authenticateToken, voucherController.deleteManyVoucher)
router.get('/', voucherController.getVoucher)
module.exports = router
