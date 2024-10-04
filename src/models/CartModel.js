const mongoose = require('mongoose')

const CartSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
        items: [
            {
                variant: { type: mongoose.Schema.Types.ObjectId, ref: 'product_variant' },
                quantity: { type: Number, required: true, min: 1 },
                status: { type: String, default: 'pending', enum: ['pending', 'expired', 'checkout'] },
            },
        ],
    },
    { timestamps: true }
)

module.exports = mongoose.model('Cart', CartSchema)
