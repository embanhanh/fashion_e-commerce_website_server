const PromotionalCombo = require('../models/PromotionalComboModel')

class PromotionalComboController {
    // [GET] /promotional-combos
    async getAllPromotionalCombos(req, res, next) {
        try {
            const promotionalCombos = await PromotionalCombo.find().populate('products')
            res.json(promotionalCombos)
        } catch (err) {
            next(err)
        }
    }
    // [POST] /promotional-combos/create
    async createPromotionalCombo(req, res, next) {
        try {
            const promotionalCombo = await PromotionalCombo.create(req.body)
            res.json(promotionalCombo)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /promotional-combos/:combo_id
    async getPromotionalComboById(req, res, next) {
        try {
            const promotionalCombo = await PromotionalCombo.findById(req.params.combo_id).populate('products')
            if (!promotionalCombo) {
                return res.status(404).json({ message: 'Không tìm thấy combo' })
            }
            res.json(promotionalCombo)
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /promotional-combos/edit/:combo_id
    async updatePromotionalCombo(req, res, next) {
        try {
            const promotionalCombo = await PromotionalCombo.findByIdAndUpdate(req.params.combo_id, req.body, { new: true }).populate('products')
            if (!promotionalCombo) {
                return res.status(404).json({ message: 'Không tìm thấy combo' })
            }
            res.json(promotionalCombo)
        } catch (err) {
            next(err)
        }
    }
    // [POST] /promotional-combos/delete-many
    async deleteManyPromotionalCombos(req, res, next) {
        try {
            const promotionalCombos = await PromotionalCombo.delete({ _id: { $in: req.body.comboIds } })
            if (promotionalCombos.nModified === 0) {
                return res.status(404).json({ message: 'Không tìm thấy combo nào để xóa' })
            }
            res.json(req.body.comboIds)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new PromotionalComboController()
