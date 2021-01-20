process.title = 'node-chat';
require('dotenv').config();
// =============================================================================
// SERVER SIDE CODE
// =============================================================================
const express   = require('express');
const ws        = require('ws');
const app       = express();

const fs        = require('fs');
// OpenSSL
const key       = fs.readFileSync("C:\\key-rsa.pem");
const cert      = fs.readFileSync("C:\\cert.pem");

const bodyParser= require('body-parser');
const methods   = require('./methods');
const httpsServer= require('https').createServer({key,cert}, app);
// const stringify = require('json-stringify-pretty-compact');

// Check for environment variables
if (
    !process.env.WIT_KEY //||
    // !process.env.FB_TOKEN ||
    // !process.env.FB_KEY
) {
    console.log('❌  Env variables missing'); // eslint-disable-line no-console
    process.exit(1);
}

// -------------------------------------------------
// WebSocket server
// -------------------------------------------------
// set up headless websocket server that prints any
// event that come in
const attachMessageHandler = require('./message-handler');

const wsServer = new ws.Server({
    port:3000, 
    server: httpsServer,
    clientTracking: true
});

// upgrade process
// https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server
// server.on('upgrade', (req, socket, head) => {
//     wsServer.handleUpgrade(req, socket, head, socket => {
//         wsServer.emit('connection', socket, req);
//     })
// });


// listen to messages sent by the user 
// get replies from wit.ai
// and trigger the appropriate actions (event sent to GUI)
attachMessageHandler(wsServer);
// -------------------------------------------------

const port = process.env.port || 80;
// const hostname = '139.91.183.118';
const hostname = '192.168.1.3';

httpsServer.listen(port, hostname, () => {
    console.log(`Chatbot Server is listening at     https://${hostname}:${port}`);
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

// =============================================================================
// ROUTES FOR OUR API
// =============================================================================
const router = express.Router();

// middleware to use for all requests
// we want sth to happen every time a request is sent to our API
router.use(function(req, res, next) {
    // logging
    console.log('Something is happening... New route request');
    next(); // make sure we go to the next routes and don't stop here
});

// test router (accessed at GET http://localhost:80/api)
router.get('/', function(req, res) {
    console.log("---> API CALL\t",req.session.id);
    res.write(`<h1>Welcome to the API!</h1>`);
    res.end();
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

//// on routes that end in /chatbot
// --------------------------------------------------------------------------------------------
router.route('/chatbot')
// (accessed at GET http://localhost:80/api/chatbot)
.get((req, res) => {
    // this is sent to the frontend jquery call as the data var of the request
    res.send("The server side of the chatbot has been accessed");
});

//// on routes that end in /chatbot/getUserMsg
// --------------------------------------------------------------------------------------------
router.route('/chatbot/userMsg')
// (accessed at GET http://localhost:80/api/chatbot/getUserMsg)
.get((req, res) => {
    res.send("got user msg");
})
.post((req, res) => {
    console.log("User said: ", req.body.userMsg);
});

//// on routes that end in /chatbot/getBotMsg
// --------------------------------------------------------------------------------------------
router.route('/chatbot/getBotMsg')
// (accessed at GET http://localhost:80/api/chatbot/getBotMsg)
.get((req, res) => {    // first receive from UI server
    res.send("received msg from UI server");
})
.post((req, res) => {    // then send to chatbot frontend
    res.send("got bot msg");
});

module.exports = router;