const jwt = require('jsonwebtoken')

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']

    if (!token) return res.sendStatus(401)

    const accessToken = token.split(' ')[1]

    jwt.verify(accessToken, 'access_token', (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' })
            }
            return res.sendStatus(403)
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
