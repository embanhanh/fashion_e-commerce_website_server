const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Banner = new Schema(
    {
        imageUrl: { type: String, required: true },
        title: { type: String },
        description: { type: String },
        buttonText: { type: String },
        linkUrl: { type: String },
        displayStartTime: { type: Date },
        displayEndTime: { type: Date },
        isActive: { type: Boolean, default: true },
        elements: {
            title: {
                left: { type: Number },
                top: { type: Number },
            },
            description: {
                left: { type: Number },
                top: { type: Number },
            },
            button: {
                left: { type: Number },
                top: { type: Number },
            },
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('banner', Banner)
