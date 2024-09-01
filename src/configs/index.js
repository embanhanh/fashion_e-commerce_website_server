const mongoose = require('mongoose')
require('dotenv').config()

const connect = async () => {
    try {
        await mongoose.connect(`mongodb+srv://22521430:${process.env.MONGOPASS}@cluster0.vufb5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`)
        console.log('MongoDB connected')
    } catch (err) {
        console.error(err.message)
        process.exit(1)
    }
}

module.exports = { connect }
