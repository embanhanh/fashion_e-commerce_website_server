const express = require('express')
const router = express.Router()
const voucherController = require('../controllers/VoucherController')
const { authenticateToken, authorizeRole } = require('../middlewares/AuthMiddleware')

router.get('/get/:voucherId', voucherController.getVoucherById)
router.post('/create', authenticateToken, authorizeRole(['admin']), voucherController.createVoucher)
router.put('/edit/:voucherId', authenticateToken, authorizeRole(['admin']), voucherController.updateVoucher)
router.delete('/remove/:voucherId', authenticateToken, authorizeRole(['admin']), voucherController.deleteVoucher)
router.post('/delete-many', authenticateToken, authorizeRole(['admin']), voucherController.deleteManyVoucher)
router.put('/give/:userId', authenticateToken, authorizeRole(['admin']), voucherController.giveVoucher)
router.put('/give-many', authenticateToken, authorizeRole(['admin']), voucherController.giveManyVoucher)
router.get('/', voucherController.getVoucher)
module.exports = router
