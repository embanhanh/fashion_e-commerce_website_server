const jwt = require('jsonwebtoken')

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']

    if (!token) return res.status(401).json({ message: 'Không tìm thấy token xác thực' })

    const accessToken = token.split(' ')[1]

    jwt.verify(accessToken, 'access_token', (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token hết hạn' })
            }
            return res.status(403).json({ message: 'Token không hợp lệ' })
        }
        req.user = user
        next()
    })
}

const authorizeRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.sendStatus(403)
        }
        next()
    }
}

module.exports = {
    authenticateToken,
    authorizeRole,
}
