// =============================================================================
// SERVER SIDE CODE
// =============================================================================
const express = require('express')
const app = express()

const bodyParser= require('body-parser');
const methods = require('./methods');

const port = process.env.port || 80;

app.listen(port, () => {
    console.log(`Chatbot Server is listening at port:${port}`);
})

// all files inside public are static and available to the frontend
app.use(express.static('public'));


// WIT STARTING POINT
const fb_token = 'abc12345'
const bot = new methods('EAAIidVs6fVYBAGGBrywkRKKXKyG8F2UGP2y6sZA7dcO29whI1HVjR6PrOxGzXJnDFbCZBMwE7nrnWEbzqsWnoHS8ZAqzaHrVD27BxdO1qZBlvPUvbtC6AZBRIRlGkfOPZAdHn3mwhfDAWRu5yUGrdvIjfnGrBNxo189seRG9UsuwZDZD')

// Configuring body parser middleware
// this will let us get the data from a POST sent by FB
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.get('/', (req, res, next) => {
    if(req.query['hub.mode'] == 'subscribe' && req.query['hub.verify_token'] == fb_token) {
        res.end(req.query['hub.challenge'])
    } else {
        next();
    }
})

app.post('/', (req, res, next) => {
    const response = req.body
    if(response.object === "page") {
        const msgObject = bot.getMessageObject(response)
        bot.sendText(`You said: ${msgObject.message}`, msgObject.id)
    }
})
