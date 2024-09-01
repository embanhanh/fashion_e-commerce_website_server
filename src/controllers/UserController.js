const User = require('../models/UserModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

class UserController {
    // [POST] /user/login
    async login(req, res, next) {
        try {
            const { email, password } = req.body

            // Tìm user theo email
            const user = await User.findOne({ email })
            if (!user) {
                return res.status(400).json({ message: 'User unavailable' })
            }

            // Kiểm tra password
            const isMatch = await bcrypt.compare(password, user.password)
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid password' })
            }

            // Tạo token JWT
            const token = jwt.sign({ id: user._id }, 'access_token', { expiresIn: '1h' })

            // Trả về token và thông tin user
            return res.status(200).json({ token, user: { id: user._id, email: user.email } })
        } catch (err) {
            next(err)
        }
    }

    // [POST] /user/register
    async register(req, res, next) {
        try {
            const { email, password } = req.body

            let user = await User.findOne({ email })
            if (user) {
                return res.status(400).json({ message: 'Email already exists' })
            }

            user = new User({ email, password })
            await user.save()

            const token = jwt.sign({ id: user._id }, 'access_token', { expiresIn: '1h' })

            return res.status(201).json({ token, user: { id: user._id, email: user.email } })
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new UserController()
