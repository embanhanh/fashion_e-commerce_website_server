const mongoose = require('mongoose')

const Schema = mongoose.Schema

const Interaction = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'product_tiki', required: true },
    type: { type: String, enum: ['view', 'like', 'click', 'add_to_cart', 'add_to_wishlist', 'purchase', 'rating'], required: true },
    value: { type: Number, default: 0 },
    section_id: { type: String, default: '' },  
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

// Create index for user and product
Interaction.index({ user: 1, createdAt: -1 })
Interaction.index({ product: 1, createdAt: -1 })
Interaction.index({ type: 1 })
Interaction.index({ section_id: 1 })
Interaction.index({ createdAt: -1 })

module.exports = mongoose.model('interaction', Interaction)
