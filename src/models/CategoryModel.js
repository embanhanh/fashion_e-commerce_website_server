const mongoose = require('mongoose')
const slug = require('mongoose-slug-updater')

mongoose.plugin(slug)

const Schema = mongoose.Schema

const CategorySchema = new Schema(
    {
        name: { type: String, required: true },
        parentCategory: { type: Schema.Types.ObjectId, ref: 'category', default: null },
        slug: { type: String, slug: 'name', unique: true },
    },
    { timestamps: true }
)

module.exports = mongoose.model('category', CategorySchema)
