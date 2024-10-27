const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const User = require('../models/UserModel')
const Address = require('../models/AddressModel')
const OerderProduct = require('../models/OrderProductModel')
const Voucher = require('../models/VoucherModel')
const { bucket } = require('../configs/FirebaseConfig')

const { verifyFirebaseToken, gennerateAccessToken, gennerateRefreshToken } = require('../util/TokenUtil')

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
            const accessToken = await gennerateAccessToken({ data: user })
            const refreshToken = await gennerateRefreshToken({ data: user })

            // Trả về token và thông tin user
            return res.status(200).json({ token: accessToken, refreshToken: refreshToken, user: user })
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
                let user = await User.findOne({ id: result.user.uid })
                if (!user) {
                    user = await User.create({
                        id: result.user.uid,
                        email: result.user.email,
                        name: result.user.name,
                        password: '',
                        urlImage: result.user.picture,
                    })
                }
                const jwtToken = await gennerateAccessToken({ data: user })
                const refreshToken = await gennerateRefreshToken({ data: user })
                return res.status(200).json({ token: jwtToken, refreshToken: refreshToken, user: user })
            } else {
                return res.status(400).json({ message: 'Đã có lỗi xảy ra trong quá trinh đăng nhập, vui lòng thử lại' })
            }
        } catch (err) {
            next(err)
        }
    }
    // [POST] /user/refresh-token
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body
            if (!refreshToken) {
                return res.status(401).json({ message: 'Refresh token is required' })
            }

            jwt.verify(refreshToken, 'refresh_token', async (err, user) => {
                if (err) return res.status(403).json({ message: 'Invalid refresh token' })

                const accessToken = await gennerateAccessToken({ data: user.data })
                res.json({ accessToken })
            })
        } catch (error) {
            next(error)
        }
    }

    // [POST] /user/register
    async register(req, res, next) {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' })
            }

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
            const idUser = user.data._id
            const userFind = await User.findOne({ _id: idUser })
            if (!userFind) {
                return res.status(404).json({ message: 'No user founded.' })
            }
            return res.status(200).json(userFind)
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /user/account/profile/edit
    async updateProfileUser(req, res, next) {
        try {
            const user = req.user
            const idUser = user.data._id
            const { name, gender, birthday, phone, urlImage } = req.body
            const userFind = await User.findOne({ _id: idUser })
            if (!userFind) {
                return res.status(404).json({ message: 'No user founded.' })
            }
            if (userFind.urlImage && userFind.urlImage !== urlImage && userFind.urlImage.startsWith('https://firebasestorage.googleapis.com')) {
                const fileName = decodeURIComponent(userFind.urlImage).split('/').pop().split('?')[0]
                const filePath = `avatars/${fileName}`
                const [fileExists] = await bucket.file(filePath).exists()
                if (fileExists) {
                    await bucket.file(filePath).delete()
                    console.log(`File ${filePath} đã được xóa từ Storage`)
                } else {
                    console.log(`File ${filePath} không tồn tại trong Storage`)
                }
            }
            userFind.name = name
            userFind.gender = gender
            userFind.birthday = birthday
            userFind.phone = phone
            userFind.urlImage = urlImage
            await userFind.save()
            return res.status(200).json(userFind)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/account/address
    async getAddressUser(req, res, next) {
        try {
            const user = req.user
            const idUser = user.data._id
            const address = await Address.find({ user: idUser }).populate('user')
            return res.status(200).json(address)
        } catch (err) {
            next(err)
        }
    }
    // [POST] /user/account/address/create
    async createAddressUser(req, res, next) {
        try {
            const { _id: userId } = req.user.data
            const { name, phone, location, type, default: isDefault, address } = req.body

            if (isDefault === true) {
                await Address.updateMany({ user: userId }, { $set: { default: false } })
            }

            const newAddress = await Address.create({
                user: userId,
                name,
                phone,
                location,
                type,
                default: isDefault,
                address,
            })

            return res.status(201).json(newAddress)
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /user/account/address/update/:id
    async updateAddressUser(req, res, next) {
        try {
            const { _id: userId } = req.user.data
            const { name, phone, location, type, default: isDefault, address } = req.body
            const id = req.params.id

            if (isDefault === true) {
                await Address.updateMany({ user: userId }, { $set: { default: false } })
            }

            const updatedAddress = await Address.findOneAndUpdate(
                { _id: id, user: userId },
                {
                    name,
                    phone,
                    location,
                    type,
                    default: isDefault,
                    address,
                }
            )
            if (!updatedAddress) {
                return res.status(404).json({ message: 'No address founded.' })
            }
            return res.status(200).json(updatedAddress)
        } catch (err) {
            next(err)
        }
    }
    // [DELETE] /user/account/address/delete/:id
    async deleteAddressUser(req, res, next) {
        try {
            const { _id: userId } = req.user.data
            const id = req.params.id
            const address = await Address.findOneAndDelete({ _id: id, user: userId })
            if (!address) {
                return res.status(404).json({ message: 'No address founded.' })
            }
            return res.status(200).json({ message: 'Địa chỉ đã được xóa thành công' })
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/account/payment
    async getPaymentUser(req, res, next) {
        try {
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/account/voucher
    async getVoucherUser(req, res, next) {
        try {
            const { _id: userId } = req.user.data
            const user = await User.findOne({ _id: userId }).populate('vouchers')
            return res.status(200).json(user.vouchers)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new UserController()
