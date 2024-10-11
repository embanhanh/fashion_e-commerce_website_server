const userRouter = require('./UserRoute')
const productRouter = require('./ProductRoute')
const orderRouter = require('./OrderProductRoute')
const { authenticateToken } = require('../middlewares/AuthMiddleware')
const categoryRouter = require('./CategoryRoute')
const cartRouter = require('./CartRoute')
const shopRouter = require('./ShopRoute')
const bannerRouter = require('./BannerRoute')
function route(app) {
    app.use('/user', userRouter)
    app.use('/product', productRouter)
    app.use('/order', orderRouter)
    app.use('/category', categoryRouter)
    app.use('/cart', cartRouter)
    app.use('/shop', shopRouter)
    app.use('/banner', bannerRouter)
}

module.exports = route
