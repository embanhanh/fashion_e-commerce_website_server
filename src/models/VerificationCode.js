const mongoose = require('mongoose')

const verificationCodeSchema = new mongoose.Schema({
    email: { type: String },
    phone: { type: String },
    code: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }, // Tự động xóa sau 5 phút
})

// Đảm bảo có ít nhất một trong hai trường email hoặc phone
verificationCodeSchema.pre('save', function (next) {
    if (!this.email && !this.phone) {
        next(new Error('Phải có ít nhất một trong hai trường email hoặc phone'))
    }
    next()
})

module.exports = mongoose.model('VerificationCode', verificationCodeSchema)
