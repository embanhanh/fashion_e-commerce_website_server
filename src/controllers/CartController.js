const Cart = require('../models/CartModel')

class CartController {
    //[Get] /cart
    async getCart(req, res, next) {
        try {
            const userId = req.user.data._id
            let cart = await Cart.findOne({ user: userId }).populate({
                path: 'items.variant',
                populate: { path: 'product' },
            })
            if (!cart) {
                cart = new Cart({
                    user: userId,
                    items: [],
                })
                await cart.save()
            }
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

            const updatedCart = await cart.save()
            await updatedCart.populate({
                path: 'items.variant',
                populate: { path: 'product' },
            })
            res.status(200).json(updatedCart)
        } catch (err) {
            next(err)
        }
    }

    // [PUT] /cart/update/:itemId
    async updateCartItem(req, res, next) {
        try {
            const userId = req.user.data._id
            const { itemId } = req.params
            const { quantity } = req.body

            const cart = await Cart.findOne({ user: userId })

            if (!cart) {
                return res.status(404).json({ message: 'Cart not found' })
            }

            const cartItem = cart.items.id(itemId)

            if (!cartItem) {
                return res.status(404).json({ message: 'Item not found in cart' })
            }

            cartItem.quantity = quantity

            const updatedCart = await cart.save()
            await updatedCart.populate({
                path: 'items.variant',
                populate: { path: 'product' },
            })

            res.status(200).json(updatedCart)
        } catch (err) {
            next(err)
        }
    }

    // [DELETE] /cart/remove/:itemId
    async removeCartItem(req, res, next) {
        try {
            const userId = req.user.data._id
            const { itemId } = req.params

            const cart = await Cart.findOne({ user: userId })

            if (!cart) {
                return res.status(404).json({ message: 'Cart not found' })
            }

            cart.items = cart.items.filter((item) => item._id.toString() !== itemId)

            const updatedCart = await cart.save()
            await updatedCart.populate({
                path: 'items.variant',
                populate: { path: 'product' },
            })

            res.status(200).json(updatedCart)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new CartController()
