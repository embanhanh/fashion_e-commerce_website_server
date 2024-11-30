const Voucher = require('../models/VoucherModel')
const User = require('../models/UserModel')
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
            const voucher = await Voucher.create(req.body)
            if (!voucher) {
                return res.status(404).json({ message: 'Không tạo được voucher' })
            }
            res.json(voucher)
        } catch (err) {
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
}

module.exports = new VoucherController()
