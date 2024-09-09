const mongoose = require('mongoose')
var slug = require('mongoose-slug-generator')
const bcrypt = require('bcrypt')
mongoose.plugin(slug)

const Schema = mongoose.Schema

const User = new Schema(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        name: { type: String, required: true },
        gender: { type: String, required: true },
        birthday: { type: Date, required: true },
        phone: { type: String, required: true },
        urlImage: { type: String, required: true },
    },
    { timestamps: true }
)

User.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next()
    }
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
})
module.exports = mongoose.model('users', User)
