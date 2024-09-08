const userRouter = require('./UserRoute')
const productRouter = require('./ProductRoute')
const { authenticateToken } = require('../middlewares/AuthMiddleware')

function route(app) {
    app.use('/user', userRouter)
    app.use('/product', authenticateToken, productRouter)
}

module.exports = route
