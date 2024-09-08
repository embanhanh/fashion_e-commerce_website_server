const mongoose = require('mongoose')
var slug = require('mongoose-slug-generator')
mongoose.plugin(slug)

const Schema = mongoose.Schema

const Product = new Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String, required: true },
        slug: { type: String, slug: 'name', unique: true },
        urlImage: { type: String, required: true },
        price: { type: Number, required: true },
        count: { type: Number, required: true },
        type: { type: String, required: true },
        rating: { type: Number, required: true },
    },
    { timestamps: true }
)

module.exports = mongoose.model('products', Product)
