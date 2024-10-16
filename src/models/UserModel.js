const mongoose = require('mongoose')
const slug = require('mongoose-slug-updater')
const bcrypt = require('bcrypt')
mongoose.plugin(slug)

const Schema = mongoose.Schema

const User = new Schema(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String, default: '' },
        name: { type: String, default: '' },
        gender: { type: String, default: '' },
        birthday: { type: Date, default: null },
        phone: { type: String, default: '' },
        urlImage: { type: String, default: '' },
        role: { type: String, default: 'user' },
        id: { type: String, default: '' },
        vouchers: [{ type: Schema.Types.ObjectId, ref: 'vouchers' }],
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
