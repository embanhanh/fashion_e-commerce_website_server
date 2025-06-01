const Voucher = require('../models/VoucherModel')
const User = require('../models/UserModel')
const Order = require('../models/OrderProductModel')
const mongoose = require('mongoose')
const { admin } = require('../configs/FirebaseConfig')

class VoucherController {
    //[GET] /voucher
    async getVoucher(req, res, next) {
        try {
            const voucher = await Voucher.find()
            res.json(voucher)
        } catch (err) {
            next(err)
        }
    }

    //[GET] /voucher/get/:voucherId
    async getVoucherById(req, res, next) {
        try {
            const voucher = await Voucher.findOne({ _id: req.params.voucherId }).populate('applicableProducts')
            if (!voucher) {
                return res.status(404).json({ message: 'Không tìm thấy voucher' })
            }
            res.json(voucher)
        } catch (err) {
            next(err)
        }
    }

    //[GET] /voucher/get-by-code/:voucherCode
    async getVoucherByCode(req, res, next) {
        try {
            const voucher = await Voucher.findOne({ code: req.params.voucherCode, validUntil: { $gte: new Date() }, validFrom: { $lte: new Date() } })
            if (!voucher) {
                return res.status(404).json({ message: 'Không tìm thấy voucher' })
            }
            res.json(voucher)
        } catch (err) {
            next(err)
        }
    }
    //[PUT] /voucher/edit/:voucherId
    async updateVoucher(req, res, next) {
        try {
            const updatedVoucher = await Voucher.findOneAndUpdate({ _id: req.params.voucherId }, req.body, { new: true, runValidators: true })
            if (!updatedVoucher) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin voucher để cập nhật' })
            }
            res.json(updatedVoucher)
        } catch (err) {
            next(err)
        }
    }

    //[POST] /voucher/create
    async createVoucher(req, res, next) {
        try {
            const { code, display, quantityPerUser = 1 } = req.body

            // Kiểm tra mã voucher đã tồn tại
            const existingVoucher = await Voucher.findOne({ code })
            if (existingVoucher) {
                return res.status(400).json({ message: 'Mã voucher đã tồn tại' })
            }

            // Tạo voucher mới
            const voucher = await Voucher.create(req.body)
            if (!voucher) {
                return res.status(400).json({ message: 'Không tạo được voucher' })
            }

            // Nếu display là 'public', thêm voucher vào tất cả người dùng
            if (display === 'public') {
                try {
                    await User.updateMany(
                        {}, // Cập nhật tất cả người dùng
                        {
                            $push: {
                                vouchers: {
                                    voucher: voucher._id,
                                },
                            },
                        }
                    )
                } catch (userUpdateError) {
                    console.error('Error adding voucher to users:', userUpdateError)
                    // Không hủy tạo voucher, chỉ ghi log lỗi
                }
            }

            res.status(201).json(voucher)
        } catch (err) {
            console.error('Error in createVoucher:', err)
            next(err)
        }
    }

    //[DELETE] /voucher/delete/:voucherId
    async deleteVoucher(req, res, next) {
        try {
            const voucher = await Voucher.findOneAndDelete({ _id: req.params.voucherId })
            if (!voucher) {
                return res.status(404).json({ message: 'Không tìm thấy voucher để xóa' })
            }
            res.json(voucher)
        } catch (err) {
            next(err)
        }
    }

    //[POST] /voucher/delete-many
    async deleteManyVoucher(req, res, next) {
        try {
            const { voucherIds } = req.body
            const voucher = await Voucher.delete({ _id: { $in: voucherIds } })
            if (voucher.nModified === 0) {
                return res.status(404).json({ message: 'Không tìm thấy voucher nào để xóa' })
            }
            res.json(voucherIds)
        } catch (err) {
            next(err)
        }
    }
    //[PUT] /voucher/give/:userId
    async giveVoucher(req, res, next) {
        try {
            const { userId } = req.params
            const user = await User.findById(userId)
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' })
            }
            const notifications = []
            const { voucherIds, message } = req.body
            voucherIds.forEach((voucherId) => {
                if (user.vouchers.find((voucher) => voucher.voucher.toString() === voucherId)) {
                    user.vouchers.find((voucher) => voucher.voucher.toString() === voucherId).quantity += 1
                } else {
                    user.vouchers.push({ voucher: voucherId, quantity: 1 })
                }
            })
            await user.save()
            //send message to notification
            notifications.push({
                userId: userId.toString(),
                orderId: '',
                message: `Bạn đã nhận được các mã voucher ${voucherIds.join(', ')} từ shop với lời nhắn: '${message}'`,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                read: false,
                link: `/user/account/vouchers`,
            })
            const batch = admin.firestore().batch()
            for (const notification of notifications) {
                const notificationRef = admin.firestore().collection('notifications').doc(notification.userId)
                batch.set(
                    notificationRef,
                    {
                        notifications: admin.firestore.FieldValue.arrayUnion(notification),
                    },
                    { merge: true }
                )
            }
            await batch.commit()
            res.json(user)
        } catch (err) {
            next(err)
        }
    }
    //[PUT] /voucher/give-many
    async giveManyVoucher(req, res, next) {
        try {
            const { userIds, voucherIds, message } = req.body

            // Tìm tất cả user có trong danh sách userIds
            const users = await User.find({ _id: { $in: userIds } })

            // Khởi tạo batch Firestore
            const batch = admin.firestore().batch()

            // Tạo thời gian hết hạn cho thông báo
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

            // Thêm voucher và tạo thông báo cho mỗi user
            users.forEach((user) => {
                voucherIds.forEach((voucherId) => {
                    if (user.vouchers.find((voucher) => voucher.voucher.toString() === voucherId)) {
                        user.vouchers.find((voucher) => voucher.voucher.toString() === voucherId).quantity += 1
                    } else {
                        user.vouchers.push({ voucher: voucherId, quantity: 1 })
                    }
                })
            })

            // Lưu tất cả users đã cập nhật vào MongoDB cùng lúc
            await User.bulkWrite(
                users.map((user) => ({
                    updateOne: {
                        filter: { _id: user._id },
                        update: { vouchers: user.vouchers },
                    },
                }))
            )

            // Duyệt qua từng user để thêm thông báo vào Firestore batch
            users.forEach((user) => {
                const notification = {
                    userId: user._id.toString(),
                    orderId: '',
                    message: `Bạn đã nhận được các mã voucher ${voucherIds.join(', ')} từ shop với lời nhắn: '${message}'`,
                    createdAt: new Date(),
                    expiresAt,
                    read: false,
                }

                // Tạo document reference và thêm vào batch
                const notificationRef = admin.firestore().collection('notifications').doc(user._id.toString())
                batch.set(notificationRef, { notifications: admin.firestore.FieldValue.arrayUnion(notification) }, { merge: true })
            })

            // Commit batch thông báo Firestore
            await batch.commit()

            // Gửi phản hồi thành công
            res.json(userIds)
        } catch (err) {
            next(err)
        }
    }

    //[GET] /voucher/applicable
    async getApplicableVouchers(req, res) {
        try {
            const { productsPrice, shippingPrice, products } = req.query
            const userId = req.user.id // Lấy từ middleware auth

            // Parse products nếu được gửi dưới dạng string
            const productList = products ? JSON.parse(products) : []
            const productIds = productList.map((p) => p.product)

            const totalOrderValue = parseFloat(productsPrice) + parseFloat(shippingPrice)
            const productsValue = parseFloat(productsPrice)
            const shippingValue = parseFloat(shippingPrice)

            // Query vouchers có thể áp dụng
            const currentDate = new Date()

            const applicableVouchers = await Voucher.find({
                // Voucher còn hiệu lực
                isActive: true,
                validFrom: { $lte: currentDate },
                validUntil: { $gte: currentDate },

                // Còn lượt sử dụng
                $expr: { $gt: ['$usageLimit', '$used'] },

                // Chỉ lấy voucher công khai (private voucher cần logic riêng)
                display: 'public',
            }).populate('applicableProducts')

            // Filter vouchers dựa trên điều kiện cụ thể
            const validVouchers = []

            for (const voucher of applicableVouchers) {
                let isValid = true
                let applicableValue = 0

                // Kiểm tra loại voucher và giá trị áp dụng
                if (voucher.voucherType === 'shipping') {
                    applicableValue = shippingValue
                } else if (voucher.voucherType === 'product') {
                    applicableValue = productsValue
                } else {
                    // voucher 'all' - tổng đơn hàng
                    applicableValue = totalOrderValue
                }

                // Kiểm tra giá trị đơn hàng tối thiểu
                if (voucher.minOrderValue && applicableValue < voucher.minOrderValue) {
                    isValid = false
                }

                // Kiểm tra sản phẩm áp dụng theo loại voucher
                if (voucher.voucherType === 'product') {
                    // Với voucher product, phải có ít nhất 1 sản phẩm trong danh sách applicableProducts
                    if (!voucher.applicableProducts || voucher.applicableProducts.length === 0) {
                        isValid = false // Product voucher nhưng không có sản phẩm áp dụng
                    } else {
                        const applicableProductIds = voucher.applicableProducts.map((p) => p._id.toString())
                        const hasApplicableProduct = productIds.some((productId) => applicableProductIds.includes(productId))
                        if (!hasApplicableProduct) {
                            isValid = false // Không có sản phẩm nào trong giỏ hàng thuộc danh sách áp dụng
                        }
                    }
                }
                // Với voucher type 'all' và 'shipping' thì không cần kiểm tra applicableProducts

                // Kiểm tra số lần sử dụng per user
                // if (voucher.quantityPerUser) {
                //     const userUsageCount = await getUserVoucherUsageCount(userId, voucher._id)
                //     if (userUsageCount >= voucher.quantityPerUser) {
                //         isValid = false
                //     }
                // }

                if (isValid) {
                    // Tính toán giá trị giảm giá để sắp xếp
                    let discountValue = 0

                    // Kiểm tra các biến đầu vào
                    if (!applicableValue || typeof applicableValue !== 'number' || applicableValue < 0) {
                        console.warn('applicableValue không hợp lệ:', applicableValue)
                        return // Bỏ qua voucher này
                    }
                    if (!voucher.discountValue || typeof voucher.discountValue !== 'number') {
                        console.warn('discountValue không hợp lệ:', voucher.discountValue)
                        return // Bỏ qua voucher này
                    }

                    if (voucher.discountType === 'percentage') {
                        const calculatedDiscount = (applicableValue * voucher.discountValue) / 100
                        discountValue =
                            voucher.maxDiscountValue && typeof voucher.maxDiscountValue === 'number' && voucher.maxDiscountValue !== Infinity
                                ? Math.min(calculatedDiscount, voucher.maxDiscountValue)
                                : calculatedDiscount
                    } else if (voucher.discountType === 'fixedamount') {
                        discountValue = Math.min(voucher.discountValue, applicableValue)
                    } else {
                        console.warn('discountType không hợp lệ:', voucher.discountType)
                        return // Bỏ qua voucher này
                    }

                    // Đảm bảo discountValue là số hợp lệ
                    if (isNaN(discountValue) || discountValue < 0) {
                        console.warn('discountValue không hợp lệ:', discountValue)
                        return // Bỏ qua voucher này
                    }

                    validVouchers.push({
                        ...voucher.toObject(),
                        calculatedDiscount: discountValue,
                        applicableValue: applicableValue,
                    })
                }
            }

            // Sắp xếp theo giá trị giảm giá (cao nhất trước)
            validVouchers.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)

            res.status(200).json({
                success: true,
                data: validVouchers,
                meta: {
                    total: validVouchers.length,
                    orderValue: totalOrderValue,
                    productsValue: productsValue,
                    shippingValue: shippingValue,
                },
            })
        } catch (error) {
            console.error('Error fetching applicable vouchers:', error)
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh sách voucher có thể áp dụng',
                error: error.message,
            })
        }
    }

    // API lấy private vouchers cho user cụ thể
    async getPrivateVouchers(req, res) {
        try {
            const userId = req.user.id
            const currentDate = new Date()

            // Logic để lấy private vouchers - có thể dựa trên:
            // - User membership level
            // - Special events
            // - Admin assignment
            // Ở đây mình để placeholder, bạn có thể implement logic riêng

            const privateVouchers = await Voucher.find({
                display: 'private',
                isActive: true,
                validFrom: { $lte: currentDate },
                validUntil: { $gte: currentDate },
                $expr: { $gt: ['$usageLimit', '$used'] },
                // Add your private voucher assignment logic here
            }).populate('applicableProducts')

            res.status(200).json({
                success: true,
                data: privateVouchers,
            })
        } catch (error) {
            console.error('Error fetching private vouchers:', error)
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh sách voucher riêng tư',
                error: error.message,
            })
        }
    }

    // Helper function để đếm số lần user đã sử dụng voucher
    // (Cần có bảng VoucherUsage hoặc field trong Order để track)
    // async getUserVoucherUsageCount(userId, voucherId) {
    //     try {
    //         // Option 1: Nếu có bảng VoucherUsage riêng
    //         // const VoucherUsage = require('../models/VoucherUsage');
    //         // return await VoucherUsage.countDocuments({
    //         //     user: userId,
    //         //     voucher: voucherId
    //         // });

    //         // Option 2: Nếu track trong Order
    //         const count = await Order.countDocuments({
    //             user: userId,
    //             'vouchers._id': voucherId,
    //         })

    //         return count
    //     } catch (error) {
    //         console.error('Error counting voucher usage:', error)
    //         return 0
    //     }
    // }

    // API để áp dụng voucher (validate trước khi checkout)
    async validateVoucher(req, res) {
        try {
            const { voucherCode, productsPrice, shippingPrice, products } = req.body
            const userId = req.user.id

            const productList = products || []
            const productIds = productList.map((p) => p.product)
            const totalOrderValue = parseFloat(productsPrice) + parseFloat(shippingPrice)
            const productsValue = parseFloat(productsPrice)
            const shippingValue = parseFloat(shippingPrice)

            // Tìm voucher theo code
            const voucher = await Voucher.findOne({
                code: voucherCode,
                isActive: true,
                validFrom: { $lte: new Date() },
                validUntil: { $gte: new Date() },
                $expr: { $gt: ['$usageLimit', '$used'] },
            }).populate('applicableProducts')

            if (!voucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Voucher không tồn tại hoặc đã hết hạn',
                })
            }

            // Kiểm tra private voucher
            if (voucher.display === 'private') {
                // Add logic to check if user can use this private voucher
                // For now, return error
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền sử dụng voucher này',
                })
            }

            // Validate conditions
            let applicableValue = 0
            if (voucher.voucherType === 'shipping') {
                applicableValue = shippingValue
            } else if (voucher.voucherType === 'product') {
                applicableValue = productsValue
            } else {
                applicableValue = totalOrderValue
            }

            // Check minimum order value
            if (voucher.minOrderValue && applicableValue < voucher.minOrderValue) {
                return res.status(400).json({
                    success: false,
                    message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()}đ để sử dụng voucher này`,
                })
            }

            // Check applicable products based on voucher type
            if (voucher.voucherType === 'product') {
                // Product voucher must have applicable products specified
                if (!voucher.applicableProducts || voucher.applicableProducts.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Voucher sản phẩm không hợp lệ',
                    })
                }

                const applicableProductIds = voucher.applicableProducts.map((p) => p._id.toString())
                const hasApplicableProduct = productIds.some((productId) => applicableProductIds.includes(productId))
                if (!hasApplicableProduct) {
                    return res.status(400).json({
                        success: false,
                        message: 'Voucher không áp dụng cho các sản phẩm trong giỏ hàng',
                    })
                }
            }
            // For 'all' and 'shipping' voucher types, no product restriction needed

            // Check user usage limit
            // const userUsageCount = await getUserVoucherUsageCount(userId, voucher._id)
            // if (userUsageCount >= voucher.quantityPerUser) {
            //     return res.status(400).json({
            //         success: false,
            //         message: 'Bạn đã sử dụng hết số lần cho phép của voucher này',
            //     })
            // }

            // Calculate discount
            let discountValue = 0
            if (voucher.discountType === 'percentage') {
                const calculatedDiscount = (applicableValue * voucher.discountValue) / 100
                discountValue =
                    voucher.maxDiscountValue && voucher.maxDiscountValue !== Infinity
                        ? Math.min(calculatedDiscount, voucher.maxDiscountValue)
                        : calculatedDiscount
            } else {
                discountValue = Math.min(voucher.discountValue, applicableValue)
            }

            res.status(200).json({
                success: true,
                data: {
                    voucher: voucher,
                    discountAmount: discountValue,
                    finalAmount: Math.max(0, totalOrderValue - discountValue),
                },
            })
        } catch (error) {
            console.error('Error validating voucher:', error)
            res.status(500).json({
                success: false,
                message: 'Lỗi khi xác thực voucher',
                error: error.message,
            })
        }
    }
}

module.exports = new VoucherController()
