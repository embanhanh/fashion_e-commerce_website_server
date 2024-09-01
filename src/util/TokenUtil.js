const jwt = require('jsonwebtoken')
require('dotenv').config()

const gennerateAccessToken = async (payload) => {
    const token = jwt.sign(payload, 'access_token', { expiresIn: '1h' })

    return token
}

const gennerateRefreshToken = async (payload) => {
    const token = jwt.sign(payload, 'refresh_token', { expiresIn: '365d' })

    return token
}

module.exports = {
    gennerateAccessToken,
    gennerateRefreshToken,
}
