const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const User = require('../models/UserModel')
const Address = require('../models/AddressModel')
const OrderProduct = require('../models/OrderProductModel')
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
            const user = await User.findOne({ email, password: { $ne: '' }, id: '' })
            if (!user) {
                return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác, vui lòng thử lại' })
            }

            // Kiểm tra password
            const isMatch = await bcrypt.compare(password, user.password)
            if (!isMatch) {
                return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác, vui lòng thử lại' })
            }

            if (user.isBlocked) {
                return res.status(400).json({
                    message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ chủ shop để biết thêm chi tiết',
                })
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
                if (user && user.isBlocked) {
                    return res.status(400).json({
                        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ chủ shop để biết thêm chi tiết',
                    })
                }
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

            let user = await User.findOne({ email, password: { $ne: '' }, id: '' })
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
            const idUser = user.data._id
            const { filterStatus } = req.query // Get filterStatus from query parameters

            // Build the query object
            let query = { user: idUser }
            if (filterStatus) {
                query.status = filterStatus // Add status filter if provided
            }

            const orders = await OrderProduct.find(query)
                .populate({
                    path: 'products.product',
                    populate: [
                        {
                            path: 'product', // This populates the nested product document
                            populate: { path: 'categories' }, // This populates the categories within the product
                        },
                    ],
                })
                .populate('shippingAddress')
                .populate('user')
                .populate('vouchers.voucher')

            console.log(orders)

            return res.status(200).json(orders)
        } catch (err) {
            next(err)
        }
    }

    // [GET] /user/purchase/order/:id
    async getOrderDetail(req, res, next) {
        try {
            const user = req.user
            const idUser = user.data._id
            const id = req.params.id
            const order = await OrderProduct.findOne({ user: idUser, _id: id })
                .populate({
                    path: 'products.product',
                    populate: {
                        path: 'product',
                    },
                })
                .populate('shippingAddress')
                .populate('user')
                .populate('vouchers')
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
            const { name, phone, location, type, default: isDefault, address: newAddress } = req.body

            if (isDefault) {
                await Address.updateMany({ user: userId }, { $set: { default: false } })
            }

            const address = await Address.create({
                user: userId,
                name,
                phone,
                location,
                type,
                default: isDefault,
                address: newAddress,
            })

            return res.status(201).json(address)
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /user/account/address/update/:id
    async updateAddressUser(req, res, next) {
        try {
            const { _id: userId } = req.user.data
            const { name, phone, location, type, default: isDefault, address: newAddress } = req.body
            const id = req.params.id

            if (isDefault) {
                await Address.updateMany({ user: userId }, { $set: { default: false } })
            }

            const address = await Address.findOneAndUpdate(
                { _id: id, user: userId },
                {
                    name,
                    phone,
                    location,
                    type,
                    default: isDefault,
                    address: newAddress,
                }
            )
            if (!address) {
                return res.status(404).json({ message: 'Không tìm thấy địa chỉ' })
            }
            return res.status(200).json(address)
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
    // [PUT] /user/account/address/setdefault/:id
    async setDefaultAddressUser(req, res, next) {
        try {
            const { _id: userId } = req.user.data // Lấy ID của người dùng từ req.user
            const id = req.params.id // Lấy ID của địa chỉ từ req.params

            // Bước 1: Cập nhật tất cả các địa chỉ khác của người dùng thành không mặc định
            await Address.updateMany({ user: userId }, { $set: { default: false } })

            // Bước 2: Cập nhật địa chỉ có ID thành mặc định
            const address = await Address.findOneAndUpdate({ _id: id, user: userId }, { $set: { default: true } }, { new: true })

            // Nếu không tìm thấy địa chỉ, trả về lỗi
            if (!address) {
                return res.status(404).json({ message: 'Address not found.' })
            }

            // Trả về phản hồi là địa chỉ đã được cập nhật
            return res.status(200).json(address)
        } catch (err) {
            // Xử lý lỗi và chuyển sang middleware tiếp theo
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
            const user = await User.findOne({ _id: userId }).populate({
                path: 'vouchers.voucher',
                populate: {
                    path: 'applicableProducts',
                },
            })
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' })
            }

            return res.status(200).json(user.vouchers)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/clients
    async getClients(req, res, next) {
        try {
            const { name, phone, totalSpent, orderCount, clientType, userIds } = req.query
            let query = { role: 'user' }

            // Thêm các điều kiện lọc
            if (name) {
                query.name = { $regex: name, $options: 'i' }
            }
            if (phone) {
                query.phone = { $regex: phone, $options: 'i' }
            }
            if (clientType) {
                query.clientType = clientType
            }

            if (userIds && userIds.length > 0) {
                query._id = { $in: userIds }
            }

            const clients = await User.find(query)
            const orders = await OrderProduct.find({ user: { $in: clients.map((client) => client._id) } })
            const userStats = {}

            // Tính toán số đơn hàng và tổng tiền cho mỗi user
            orders.forEach((order) => {
                if (!userStats[order.user.toString()]) {
                    userStats[order.user.toString()] = {
                        orderCount: 0,
                        totalSpent: 0,
                    }
                }
                userStats[order.user.toString()].orderCount++
                userStats[order.user.toString()].totalSpent += order.totalPrice
            })

            // Lọc và thêm thông tin vào kết quả
            let clientsWithStats = clients.map((client) => {
                const stats = userStats[client._id.toString()] || { orderCount: 0, totalSpent: 0 }
                return {
                    ...client.toObject(),
                    orderCount: stats.orderCount,
                    totalSpent: stats.totalSpent,
                }
            })

            // Lọc theo totalSpent và orderCount
            if (totalSpent) {
                clientsWithStats = clientsWithStats.filter((client) => client.totalSpent >= parseInt(totalSpent))
            }
            if (orderCount) {
                clientsWithStats = clientsWithStats.filter((client) => client.orderCount >= parseInt(orderCount))
            }

            return res.status(200).json(clientsWithStats)
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /user/clients/block/:userId
    async blockClient(req, res, next) {
        try {
            const { userId } = req.params
            const { reasons } = req.body
            const user = await User.findOne({ _id: userId })
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' })
            }
            user.blockReasons = reasons
            user.isBlocked = true
            await user.save()
            return res.status(200).json(user)
        } catch (err) {
            next(err)
        }
    }
    // [PATH] /user/clients/block-many
    async blockManyClient(req, res, next) {
        try {
            const { userIds, reasons } = req.body
            const users = await User.find({ _id: { $in: userIds } })
            const updateOperations = users
                .filter((user) => !user.isBlocked)
                .map((user) => ({
                    updateOne: {
                        filter: { _id: user._id },
                        update: {
                            blockReasons: reasons,
                            isBlocked: true,
                        },
                    },
                }))

            if (updateOperations.length > 0) {
                await User.bulkWrite(updateOperations)
            }
            const updatedUsers = await User.find({ _id: { $in: userIds } })
            return res.status(200).json(updatedUsers)
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /user/clients/unblock/:userId
    async unblockClient(req, res, next) {
        try {
            const { userId } = req.params
            const user = await User.findOne({ _id: userId })
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' })
            }
            user.isBlocked = false
            user.blockReasons = []
            await user.save()
            return res.status(200).json(user)
        } catch (err) {
            next(err)
        }
    }
    // [PATH] /user/clients/unblock-many
    async unblockManyClient(req, res, next) {
        try {
            const { userIds } = req.body
            const users = await User.find({ _id: { $in: userIds } })
            const updateOperations = users
                .filter((user) => user.isBlocked)
                .map((user) => ({
                    updateOne: { filter: { _id: user._id }, update: { isBlocked: false, blockReasons: [] } },
                }))
            if (updateOperations.length > 0) {
                await User.bulkWrite(updateOperations)
            }
            const updatedUsers = await User.find({ _id: { $in: userIds } })
            return res.status(200).json(updatedUsers)
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /user/clients/update-client-type/:userId
    async updateClientType(req, res, next) {
        try {
            const { userId } = req.params
            const { clientType } = req.body
            const user = await User.findOne({ _id: userId })
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' })
            }
            if (clientType && user.clientType !== clientType) {
                user.clientType = clientType
                await user.save()
            }
            return res.status(200).json(user)
        } catch (err) {
            next(err)
        }
    }
    // [PATH] /user/clients/update-client-type-many
    async updateManyClientType(req, res, next) {
        try {
            const { userIds, clientType } = req.body
            const users = await User.find({ _id: { $in: userIds } })
            const updateOperations = users
                .filter((user) => user.clientType !== clientType)
                .map((user) => ({
                    updateOne: { filter: { _id: user._id }, update: { clientType: clientType } },
                }))
            if (updateOperations.length > 0) {
                await User.bulkWrite(updateOperations)
            }
            const updatedUsers = await User.find({ _id: { $in: userIds } })
            return res.status(200).json(updatedUsers)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new UserController()
