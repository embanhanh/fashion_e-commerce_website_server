const Shop = require('../models/ShopModel')

class ShopController {
    //[GET] /shop
    async getShop(req, res, next) {
        try {
            const shop = await Shop.findOne()
            if (!shop) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin shop' })
            }
            res.json(shop)
        } catch (err) {
            next(err)
        }
    }

    //[PUT] /shop/edit
    async updateShop(req, res, next) {
        try {
            const updatedShop = await Shop.findOneAndUpdate({}, req.body, { new: true, runValidators: true })
            if (!updatedShop) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin shop để cập nhật' })
            }
            res.json(updatedShop)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new ShopController()
