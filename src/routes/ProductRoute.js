var express = require('express')
var router = express.Router()
const { authenticateToken, authorizeRole } = require('../middlewares/AuthMiddleware')
const upload = require('../middlewares/uploadMiddleware')
const productController = require('../controllers/ProductController')

router.post('/like/:product_id', authenticateToken, productController.likeProduct)
router.put('/edit/:product_name', authenticateToken, authorizeRole(['admin']), productController.updateProduct)
router.post('/create', authenticateToken, authorizeRole(['admin']), productController.createProduct)
router.get('/:product_name', productController.getProductBySlug)
router.delete('/delete/:product_name', authenticateToken, authorizeRole(['admin']), productController.deleteProduct)
router.post('/delete-many', authenticateToken, authorizeRole(['admin']), productController.deleteManyProducts)
router.post('/rating/:product_id', authenticateToken, upload.array('files', 5), productController.ratingProduct)
router.get('/', productController.getAllProduct)

module.exports = router
