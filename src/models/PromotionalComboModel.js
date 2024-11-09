const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')
const Schema = mongoose.Schema

const PromotionalComboSchema = new Schema({
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    limitCombo: { type: Number, required: true },
    comboType: { type: String, required: true, enum: ['percentage', 'fixedamount'], default: 'percentage' },
    discountCombos: [
        {
            quantity: { type: Number, required: true },
            discountValue: { type: Number, required: true },
        },
    ],
    products: [{ type: Schema.Types.ObjectId, ref: 'products' }],
})

PromotionalComboSchema.plugin(mongooseDelete, {
    overrideMethods: 'all',
    deletedAt: true,
})

module.exports = mongoose.model('promotionalCombos', PromotionalComboSchema)
