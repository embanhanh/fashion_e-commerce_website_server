const userRouter = require('./UserRoute')
const productRouter = require('./ProductRoute')
const orderRouter = require('./OrderProductRoute')
const { authenticateToken } = require('../middlewares/AuthMiddleware')
const categoryRouter = require('./CategoryRoute')
const cartRouter = require('./CartRoute')
const shopRouter = require('./ShopRoute')
const bannerRouter = require('./BannerRoute')
const voucherRouter = require('./VoucherRoute')
const promotionalComboRouter = require('./PromotionalComboRoute')
const webhookRouter = require('./WebhookRoute')
function route(app) {
    app.use('/user', userRouter)
    app.use('/product', productRouter)
    app.use('/order', orderRouter)
    app.use('/category', categoryRouter)
    app.use('/cart', authenticateToken, cartRouter)
    app.use('/shop', shopRouter)
    app.use('/banner', bannerRouter)
    app.use('/voucher', voucherRouter)
    app.use('/promotional-combo', promotionalComboRouter)
    app.use('/webhook', webhookRouter)
}

module.exports = route
