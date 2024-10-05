const Cart = require('../models/CartModel')

class CartController {
    //[Get] /cart
    async getCart(req, res, next) {
        try {
            const userId = req.user.data._id
            const cart = await Cart.findOne({ user: userId }).populate({
                path: 'items.variant',
                populate: { path: 'product' },
            })
            res.status(200).json(cart)
        } catch (err) {
            next(err)
        }
    }

    //[Post] /cart/add
    async addToCart(req, res, next) {
        try {
            const userId = req.user.data._id
            const { variant, quantity } = req.body

            let cart = await Cart.findOne({ user: userId })

            if (!cart) {
                cart = new Cart({ user: userId, items: [] })
            }

            const existingItemIndex = cart.items.findIndex((item) => item.variant.toString() === variant)

            if (existingItemIndex > -1) {
                cart.items[existingItemIndex].quantity = quantity
            } else {
                cart.items.push({ variant, quantity })
            }

            await cart.save()

            res.status(200).json(cart)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new CartController()
