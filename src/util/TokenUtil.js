const jwt = require('jsonwebtoken')
require('dotenv').config()
const admin = require('../configs/FirebaseConfig')

const gennerateAccessToken = async (payload) => {
    const token = jwt.sign(payload, 'access_token', { expiresIn: '1h' })

    return token
}

const gennerateRefreshToken = async (payload) => {
    const token = jwt.sign(payload, 'refresh_token', { expiresIn: '365d' })

    return token
}

const verifyFirebaseToken = async (token) => {
    try {
        const decodedToken = await admin.auth().verifyIdToken(token)
        if (decodedToken) {
            return { success: true, user: decodedToken }
        }
        return { success: false, error: 'Invalid token' }
    } catch (error) {
        console.error('Error verifying token:', error)
        return { success: false, error: 'Invalid token' }
    }
}

module.exports = {
    gennerateAccessToken,
    gennerateRefreshToken,
    verifyFirebaseToken,
}
