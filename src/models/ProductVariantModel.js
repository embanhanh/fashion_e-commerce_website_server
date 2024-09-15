const mongoose = require('mongoose')

const Schema = mongoose.Schema

const ProductVariantSchema = new Schema(
    {
        product: { type: Schema.Types.ObjectId, ref: 'products', required: true }, // Liên kết với sản phẩm cha
        size: { type: String, required: true }, // Kích cỡ của sản phẩm (S, M, L, XL...)
        color: { type: String, required: true }, // Màu sắc của sản phẩm
        stockQuantity: { type: Number, required: true }, // Số lượng tồn kho cho từng biến thể
        imageUrl: { type: String, default: '' }, // Hình ảnh của biến thể (nếu có)
        additionalPrice: { type: Number, default: 0 }, // Phụ thu nếu size/color này có giá khác
    },
    { timestamps: true }
)

module.exports = mongoose.model('product_variant', ProductVariantSchema)
