const mongoose = require('mongoose')

const Schema = mongoose.Schema

const ShopSchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String, default: '' },
        logo: { type: String, default: '' },
        address: {
            type: String,
            default: '',
        },
        location: {
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 },
        },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        socialMedia: {
            facebook: String,
            instagram: String,
            twitter: String,
        },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        totalReviews: { type: Number, default: 0 },
        shippingPolicy: { type: String, default: '' },
        returnPolicy: { type: String, default: '' },
        promotionPolicy: { type: String, default: '' },
        workingHours: {
            monday: { open: String, close: String },
            tuesday: { open: String, close: String },
            wednesday: { open: String, close: String },
            thursday: { open: String, close: String },
            friday: { open: String, close: String },
            saturday: { open: String, close: String },
            sunday: { open: String, close: String },
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('shop', ShopSchema)
