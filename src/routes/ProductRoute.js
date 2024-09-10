var express = require('express')
var router = express.Router()

const productController = require('../controllers/ProductController')

router.put('/edit/:product_name', productController.updateProduct)
router.post('/create', productController.createProduct)
router.get('/:product_name', productController.getProductBySlug)
router.get('/', productController.getAllProduct)

module.exports = router
