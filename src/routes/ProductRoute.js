var express = require('express')
var router = express.Router()
const { authenticateToken } = require('../middlewares/AuthMiddleware')
const upload = require('../middlewares/uploadMiddleware')
const productController = require('../controllers/ProductController')

router.put('/edit/:product_name', productController.updateProduct)
router.post('/create', productController.createProduct)
router.get('/:product_name', productController.getProductBySlug)
router.delete('/delete/:product_name', productController.deleteProduct)
router.post('/delete-many', productController.deleteManyProducts)
router.post('/rating/:product_id', authenticateToken, upload.array('files', 5), productController.ratingProduct)
router.get('/', productController.getAllProduct)

module.exports = router
