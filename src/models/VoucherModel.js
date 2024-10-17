const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')
const Schema = mongoose.Schema

const VoucherSchema = new Schema(
    {
        code: { type: String, required: true, unique: true },
        voucherType: {
            type: String,
            required: true,
            enum: ['all', 'product'],
            default: 'all',
        },
        display: {
            type: String,
            required: true,
            enum: ['public', 'private'],
            default: 'public',
        },
        discountType: {
            type: String,
            required: true,
            enum: ['percentage', 'fixedamount'],
            default: 'percentage',
        },
        discountValue: { type: Number, required: true }, // Giá trị giảm (phần trăm hoặc số tiền)
        minOrderValue: { type: Number }, // Giá trị đơn hàng tối thiểu để áp dụng voucher
        maxDiscountValue: { type: Number, default: Infinity }, // Giảm giá tối đa (chỉ khi kiểu giảm giá là percentage)
        usageLimit: { type: Number, default: 1, required: true }, // Số lần voucher có thể sử dụng
        used: { type: Number, default: 0 }, // Số lần đã sử dụng
        quantityPerUser: { type: Number, default: 1, required: true }, // Số lượng voucher tối đa trên 1 khách hàng
        validFrom: { type: Date, required: true }, // Ngày bắt đầu có hiệu lực
        validUntil: { type: Date, required: true }, // Ngày hết hạn
        applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'products' }], // Áp dụng cho các sản phẩm cụ thể
        isActive: { type: Boolean, default: true }, // Trạng thái voucher (còn hiệu lực hay không)
    },
    { timestamps: true }
)

VoucherSchema.plugin(mongooseDelete, {
    overrideMethods: 'all',
    deletedAt: true,
})

module.exports = mongoose.model('vouchers', VoucherSchema)
