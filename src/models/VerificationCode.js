const mongoose = require('mongoose')

const verificationCodeSchema = new mongoose.Schema({
    email: { type: String, required: true },
    code: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }, // Tự động xóa sau 5 phút
})

module.exports = mongoose.model('VerificationCode', verificationCodeSchema)
