const mongoose = require('mongoose')

const Schema = mongoose.Schema

const VoucherSchema = new Schema(
    {
        code: { type: String, required: true, unique: true }, // Mã voucher, duy nhất
        discountType: {
            type: String,
            required: true,
            enum: ['percentage', 'fixedamount'], // Kiểu giảm giá: phần trăm hoặc số tiền cố định
            default: 'percentage',
        },
        discountValue: { type: Number, required: true }, // Giá trị giảm (phần trăm hoặc số tiền)
        minOrderValue: { type: Number, required: true }, // Giá trị đơn hàng tối thiểu để áp dụng voucher
        maxDiscountvalue: { type: Number, default: Infinity }, // Giảm giá tối đa (chỉ khi kiểu giảm giá là percentage)
        usageLimit: { type: Number, default: 1 }, // Số lần voucher có thể sử dụng
        used: { type: Number, default: 0 }, // Số lần đã sử dụng
        validFrom: { type: Date, required: true }, // Ngày bắt đầu có hiệu lực
        validUntil: { type: Date, required: true }, // Ngày hết hạn
        applicableProducts: [{ product: { type: Schema.Types.ObjectId, ref: 'products' } }], // Áp dụng cho các sản phẩm cụ thể
        isActive: { type: Boolean, default: true }, // Trạng thái voucher (còn hiệu lực hay không)
    },
    { timestamps: true }
)

module.exports = mongoose.model('vouchers', VoucherSchema)
