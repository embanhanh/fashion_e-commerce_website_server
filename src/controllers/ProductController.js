const Product = require('../models/ProductModel')

class ProductController {
    // [GET] /product/:product_name
    async getProductBySlug(req, res, next) {
        try {
            console.log(req.params.product_name)
            return res.json({ slug: req.params.product_name })
        } catch (err) {
            next(err)
        }
    }
    // [POST] /product/create
    async createProduct(req, res, next) {
        try {
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new ProductController()
