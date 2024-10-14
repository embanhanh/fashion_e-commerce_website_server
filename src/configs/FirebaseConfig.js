require('dotenv').config()
var admin = require('firebase-admin')

var serviceAccount = require('../../serviceAccountKey.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
})

const bucket = admin.storage().bucket()

module.exports = { admin, bucket }
