const User = require('../models/UserModel')
const Address = require('../models/AddressModel')
const OerderProduct = require('../models/OrderProductModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const OrderProductModel = require('../models/OrderProductModel')

class UserController {
    // [POST] /user/login
    async login(req, res, next) {
        try {
            const { email, password } = req.body

            // Tìm user theo email
            const user = await User.findOne({ email })
            if (!user) {
                return res.status(400).json({ message: 'User unavailable' })
            }

            // Kiểm tra password
            const isMatch = await bcrypt.compare(password, user.password)
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid password' })
            }

            // Tạo token JWT
            const token = jwt.sign({ id: user._id }, 'access_token', { expiresIn: '1h' })

            // Trả về token và thông tin user
            return res.status(200).json({ token, user: user })
        } catch (err) {
            next(err)
        }
    }

    // [POST] /user/register
    async register(req, res, next) {
        try {
            const { email, password } = req.body

            let user = await User.findOne({ email })
            if (user) {
                return res.status(400).json({ message: 'Email already exists' })
            }

            user = new User({ email, password })
            await user.save()

            const token = jwt.sign({ id: user._id }, 'access_token', { expiresIn: '1h' })

            return res.status(201).json({ token, user: { id: user._id, email: user.email } })
        } catch (err) {
            next(err)
        }
    }

    // [GET] /user/purchase
    async getPurchase(req, res, next) {
        try {
            const user = req.user
            const idUser = user._id
            const orders = await OerderProduct.find({ user: idUser })
                .populate({
                    path: 'products.product',
                    populate: {
                        path: 'product',
                    },
                })
                .populate('shippingAddress')
                .populate('user')
                .populate('vouchers.voucher')
            return res.status(200).json(orders)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/purchase/order/:id
    async getOrderDetail(req, res, next) {
        try {
            const user = req.user
            const idUser = user._id
            const id = req.params.id
            const order = await OerderProduct.findOne({ user: idUser, _id: id })
                .populate({
                    path: 'products.product',
                    populate: {
                        path: 'product',
                    },
                })
                .populate('shippingAddress')
                .populate('user')
                .populate('vouchers.voucher')
            return res.status(200).json(order)
        } catch (err) {
            next(err)
        }
    }

    // [GET] /user/account/profile
    async getProfileUser(req, res, next) {
        try {
            const user = req.user
            const idUser = user._id
            const userFind = User.findOne({ _id: idUser })
            if (!userFind) {
                return res.status(404).json({ message: 'No user founded.' })
            }
            return res.status(200).json(userFind)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/account/address
    async getAddressUser(req, res, next) {
        try {
            const user = req.user
            const idUser = user._id
            const address = await Address.find({ user: idUser }).populate('user')
            return res.status(200).json(address)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/account/payment
    async getPaymentUser(req, res, next) {
        try {
            const user = req.user
            const idUser = user._id
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new UserController()
