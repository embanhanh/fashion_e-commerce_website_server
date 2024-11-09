const express = require('express')
const router = express.Router()
const voucherController = require('../controllers/VoucherController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

router.get('/get/:voucherId', voucherController.getVoucherById)
router.post('/create', authenticateToken, voucherController.createVoucher)
router.put('/edit/:voucherId', authenticateToken, voucherController.updateVoucher)
router.delete('/remove/:voucherId', authenticateToken, voucherController.deleteVoucher)
router.post('/delete-many', authenticateToken, voucherController.deleteManyVoucher)
router.put('/give/:userId', authenticateToken, voucherController.giveVoucher)
router.put('/give-many', authenticateToken, voucherController.giveManyVoucher)
router.get('/', voucherController.getVoucher)
module.exports = router
