const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // email của bạn
        pass: process.env.EMAIL_PASSWORD, // mật khẩu ứng dụng của gmail
    },
})

const verifyConnection = async () => {
    try {
        await transporter.verify()
        console.log('Email server connection established successfully')
        return true
    } catch (error) {
        console.error('Error connecting to email server:', error)
        return false
    }
}

const sendOrderEmail = async (to, subject, content) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            html: content,
        })
        return true
    } catch (error) {
        console.error('Lỗi gửi email:', error)
        return false
    }
}

const sendVerificationEmail = async (email, verificationCode) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Xác thực email đăng ký',
            html: `
        <h2>Xác thực email của bạn</h2>
        <p>Mã xác thực của bạn là: <strong>${verificationCode}</strong></p>
        <p>Mã này sẽ hết hạn sau 5 phút.</p>
      `,
        }

        return await transporter.sendMail(mailOptions)
    } catch (error) {
        console.error('Lỗi gửi email:', error)
        return false
    }
}

module.exports = { sendOrderEmail, verifyConnection, sendVerificationEmail }
