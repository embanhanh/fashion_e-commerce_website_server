const userRouter = require('./UserRoute')

function route(app) {
    app.use('/user', userRouter)
}

module.exports = route
