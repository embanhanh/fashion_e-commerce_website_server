const mongoose = require('mongoose')

const Schema = mongoose.Schema

const CategorySchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String, default: '' },
        parentCategory: { type: Schema.Types.ObjectId, ref: 'category', default: null },
    },
    { timestamps: true }
)

module.exports = mongoose.model('category', CategorySchema)
