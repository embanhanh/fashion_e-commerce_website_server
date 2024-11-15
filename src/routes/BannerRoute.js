const express = require('express')
const router = express.Router()
const bannerController = require('../controllers/BannerController')
const { authenticateToken, authorizeRole } = require('../middlewares/AuthMiddleware')

router.get('/get/:bannerId', bannerController.getBannerById)
router.post('/create', authenticateToken, authorizeRole(['admin']), bannerController.createBanner)
router.put('/edit/:bannerId', authenticateToken, authorizeRole(['admin']), bannerController.editBanner)
router.delete('/remove/:bannerId', authenticateToken, authorizeRole(['admin']), bannerController.removeBanner)
router.post('/remove-many', authenticateToken, authorizeRole(['admin']), bannerController.removeManyBanners)
router.get('/', bannerController.getBanner)
module.exports = router
