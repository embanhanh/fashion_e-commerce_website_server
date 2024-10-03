const mongoose = require('mongoose')
const slug = require('mongoose-slug-updater')
const mongooseDelete = require('mongoose-delete')
mongoose.plugin(slug)

const Schema = mongoose.Schema

const Product = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        slug: { type: String, slug: 'name', unique: true },
        urlImage: [{ type: String, default: '' }],
        brand: { type: String, default: '' },
        material: { type: String, default: '' },
        originalPrice: { type: Number, required: true, default: 0 },
        stockQuantity: { type: Number, required: true, default: 0 },
        rating: { type: Number, required: true, default: 0 },
        isFeatured: { type: Boolean, default: false }, // Sản phẩm nổi bật
        isActive: { type: Boolean, default: true }, // Trạng thái sản phẩm
        discount: { type: Number, default: 0 }, // Phần trăm giảm giá
        categories: [{ type: Schema.Types.ObjectId, ref: 'category' }],
        variants: [{ type: Schema.Types.ObjectId, ref: 'product_variant' }], // Liên kết tới bảng ProductVariant
        minOrderQuantity: { type: Number, default: 1 }, // Thêm mới
        maxOrderQuantity: { type: Number, default: 100 },
        soldQuantity: { type: Number, default: 0 },
    },
    { timestamps: true }
)

Product.plugin(mongooseDelete, {
    overrideMethods: 'all',
    deletedAt: true,
})

module.exports = mongoose.model('products', Product)
