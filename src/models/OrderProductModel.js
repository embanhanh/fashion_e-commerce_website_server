const mongoose = require('mongoose')

const Schema = mongoose.Schema

const OrderProducts = new Schema(
    {
        products: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: 'product_variant', required: true },
                quantity: { type: Number, required: true },
            },
        ],
        paymentMethod: { type: String, required: true, enum: ['paymentUponReceipt', 'bankTransfer'], default: 'paymentUponReceipt' },
        productsPrice: { type: Number, required: true },
        shippingPrice: { type: Number, required: true, default: 0 },
        totalPrice: { type: Number, required: true },
        status: { type: String, enum: ['pending', 'processing', 'delivering', 'delivered', 'cancelled'], default: 'pending' },
        shippingAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'address', required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
        paidAt: { type: Date, default: null },
        deliveredAt: { type: Date, default: null },
        vouchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'vouchers' }],
        shippingMethod: { type: String, enum: ['basic', 'fast', 'express'], default: 'basic' },
        expectedDeliveryDate: {
            startDate: { type: Date, default: null },
            endDate: { type: Date, default: null },
        },
        transferOption: { type: String, enum: ['momo', 'bank'], default: null },
        cancelReason: { type: String, default: null },
    },
    { timestamps: true }
)

module.exports = mongoose.model('order_products', OrderProducts)
