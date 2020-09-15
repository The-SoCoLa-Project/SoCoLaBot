// const express = require('express')
// const app = express()

// Restify used to create restful APIs
const Restify = require('restify')
const methods = require('./methods')
const app = Restify.createServer({
    name: 'socolabot'
})


// WIT STARTING POINT
const fb_token = 'abc12345'
const bot = new methods('EAAIidVs6fVYBAGGBrywkRKKXKyG8F2UGP2y6sZA7dcO29whI1HVjR6PrOxGzXJnDFbCZBMwE7nrnWEbzqsWnoHS8ZAqzaHrVD27BxdO1qZBlvPUvbtC6AZBRIRlGkfOPZAdHn3mwhfDAWRu5yUGrdvIjfnGrBNxo189seRG9UsuwZDZD')
// const WITAI_TOKEN = 'Z2OYBXD5WYUT437Z4T7QB2PNMJ6RZYCT'

// parse post data sent by fb
app.use(Restify.plugins.jsonp())
app.use(Restify.plugins.bodyParser())

app.get('/', (req, res, next) => {
    if(req.query['hub.mode'] == 'subscribe' && req.query['hub.verify_token'] == fb_token) {
        res.end(req.query['hub.challenge'])
    } else {
        next()
    }
})

app.post('/', (req, res, next) => {
    const response = req.body
    if(response.object === "page") {
        const msgObject = bot.getMessageObject(response)
        bot.sendText(`You said: ${msgObject.message}`, msgObject.id)
    }
})

app.listen(8080, () => console.log('server is running'))