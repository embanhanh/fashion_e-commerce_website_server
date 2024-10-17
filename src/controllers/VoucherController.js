const Voucher = require('../models/VoucherModel')

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
}

module.exports = new VoucherController()
