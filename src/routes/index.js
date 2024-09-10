const userRouter = require('./UserRoute')
const productRouter = require('./ProductRoute')
const orderRouter = require('./OrderProductRoute')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

function route(app) {
    app.use('/user', userRouter)
    app.use('/product', authenticateToken, productRouter)
    app.use('/order', authenticateToken, orderRouter)
}

module.exports = route
