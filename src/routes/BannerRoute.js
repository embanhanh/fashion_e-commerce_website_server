const express = require('express')
const router = express.Router()
const bannerController = require('../controllers/BannerController')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

router.get('/get/:bannerId', bannerController.getBannerById)
router.post('/create', authenticateToken, bannerController.createBanner)
router.put('/edit/:bannerId', authenticateToken, bannerController.editBanner)
router.delete('/remove/:bannerId', authenticateToken, bannerController.removeBanner)
router.get('/', bannerController.getBanner)
module.exports = router
