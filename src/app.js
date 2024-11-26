const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
require('dotenv').config()
const db = require('./configs/MongoConfig')
const route = require('./routes')
const { verifyConnection } = require('./configs/EmailConfig')
const app = express()
const port = process.env.PORT || 5000
const portEmail = process.env.PORT_EMAIL || 587

app.use(cors())
app.use(bodyParser.json())

db.connect()
route(app)

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`)
})

app.listen(portEmail, async () => {
    await verifyConnection()
})
