const mongoose = require('mongoose')
var slug = require('mongoose-slug-generator')
mongoose.plugin(slug)

const Schema = mongoose.Schema

const Product = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String },
        slug: { type: String, slug: 'name', unique: true },
        urlImage: { type: String },
        brand: { type: String },
        material: { type: String },
        originalPrice: { type: Number, required: true },
        stockQuantity: { type: Number, required: true },
        rating: { type: Number, required: true, default: 0 },
        isFeatured: { type: Boolean, default: false }, // Sản phẩm nổi bật
        isActive: { type: Boolean, default: true }, // Trạng thái sản phẩm
        discount: { type: Number, default: 0 }, // Phần trăm giảm giá
        categories: [{ category: { type: Schema.Types.ObjectId, ref: 'category', require: true } }],
        variants: [{ variant: { type: Schema.Types.ObjectId, ref: 'product_variant' } }], // Liên kết tới bảng ProductVariant
    },
    { timestamps: true }
)

module.exports = mongoose.model('products', Product)
