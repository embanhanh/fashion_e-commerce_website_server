const PromotionalCombo = require('../models/PromotionalComboModel')

class PromotionalComboController {
    // [GET] /promotional-combos
    async getAllPromotionalCombos(req, res, next) {
        try {
            const promotionalCombos = await PromotionalCombo.find()
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
}

module.exports = new PromotionalComboController()
