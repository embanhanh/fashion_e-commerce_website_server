const Shop = require('../models/ShopModel')

class ShopController {
    //[Get] /shop
    async getShop(req, res, next) {
        try {
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new ShopController()
