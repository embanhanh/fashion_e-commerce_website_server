const userRouter = require('./UserRoute')
const productRouter = require('./ProductRoute')
const orderRouter = require('./OrderProductRoute')
const { authenticateToken } = require('../middlewares/AuthMiddleware')
const categoryRouter = require('./CategoryRoute')
const cartRouter = require('./CartRoute')

function route(app) {
    app.use('/user', userRouter)
    app.use('/product', productRouter)
    app.use('/order', orderRouter)
    app.use('/category', categoryRouter)
    app.use('/cart', cartRouter)
}

module.exports = route
