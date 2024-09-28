const userRouter = require('./UserRoute')
const productRouter = require('./ProductRoute')
const orderRouter = require('./OrderProductRoute')
const { authenticateToken } = require('../middlewares/AuthMiddleware')
const categoryRouter = require('./CategoryRoute')

function route(app) {
    app.use('/user', userRouter)
    app.use('/product', productRouter)
    app.use('/order', orderRouter)
    app.use('/category', categoryRouter)
}

module.exports = route
