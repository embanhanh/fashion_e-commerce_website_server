const mongoose = require('mongoose')
const Schema = mongoose.Schema

const TempOrderSchema = new Schema({
    orderId: { type: String, required: true },
    orderData: { type: Object, required: true },
    address: { type: Object, default: {} },
    user: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now, expires: 3600 },
})

module.exports = mongoose.model('temporders', TempOrderSchema)
