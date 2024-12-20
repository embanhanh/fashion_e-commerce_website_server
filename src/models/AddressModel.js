const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Address = new Schema(
    {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        location: { type: String, required: true },
        type: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
        default: { type: Boolean, default: false },
        address: {
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('address', Address)
