const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const User = require('../models/UserModel')
const Address = require('../models/AddressModel')
const OerderProduct = require('../models/OrderProductModel')
const OrderProductModel = require('../models/OrderProductModel')

const { verifyFirebaseToken, gennerateAccessToken } = require('../util/TokenUtil')

class UserController {
    // [POST] /user/login
    async login(req, res, next) {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ message: 'Không có tài khoản' })
            }
            // Tìm user theo email
            const user = await User.findOne({ email })
            if (!user) {
                return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác, vui lòng thử lại' })
            }

            // Kiểm tra password
            const isMatch = await bcrypt.compare(password, user.password)
            if (!isMatch) {
                return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác, vui lòng thử lại' })
            }

            // Tạo token JWT
            const token = jwt.sign({ data: user }, 'access_token', { expiresIn: '1h' })

            // Trả về token và thông tin user
            return res.status(200).json({ token, user: user })
        } catch (err) {
            next(err)
        }
    }
    // [POST] /user/login/facebook || /user/login/google
    async loginWithFirebase(req, res, next) {
        try {
            const { token } = req.body

            const result = await verifyFirebaseToken(token)
            if (result.success) {
                let user = await User.findOne({ email: result.user.uid })
                if (!user) {
                    user = await User.create({
                        email: result.user.uid,
                        name: result.user.name,
                        password: '',
                        urlImage: result.user.picture,
                    })
                }
                const jwtToken = await gennerateAccessToken({ data: user })
                return res.status(200).json({ token: jwtToken, user: user })
            } else {
                return res.status(400).json({ message: 'Không thể đăng nhập, vui lòng thử lại' })
            }
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
                return res.status(400).json({ message: 'Email đã tồn tại, vui lòng nhập lại email' })
            }

            user = new User({ email, password })
            await user.save()

            return res.status(201).json({ user: { id: user._id, email: user.email } })
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
