var express = require('express')
var router = express.Router()

const productController = require('../controllers/ProductController')

router.get('/:product_name', productController.getProductBySlug)
router.post('/create', productController.createProduct)

module.exports = router
