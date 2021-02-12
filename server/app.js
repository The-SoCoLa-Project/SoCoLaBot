process.title = 'node-chat';
require('dotenv').config();
// =============================================================================
// SERVER SIDE CODE
// =============================================================================
const express   = require('express');
const ws        = require('ws');
const app       = express();

const fs        = require('fs');
const bodyParser= require('body-parser');
// const methods   = require('./methods');
const axios     = require('axios');

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

const port = process.env.port || 8443;
// const hostname = '139.91.183.118';
const hostname = '192.168.1.7';

const httpserver= require('https').createServer({
    key:  fs.readFileSync(__dirname+'/server.key'),
    cert: fs.readFileSync(__dirname+'/server.cer'),
    // allow self-signed certs (never use this in production)
    rejectUnauthorized: false,
    requestCert: false
}, app);

// httpserver.listen(port, hostname, () => {
httpserver.listen(port, hostname, () => {
    console.log(`Chatbot Server is listening at     https://${hostname}:${port}`);
    // console.log(`Chatbot Server is listening at     https://localhost:${port}`);
})
// -------------------------------------------------
// WebSocket server
// -------------------------------------------------
// set up headless websocket server that prints any
// event that come in
const attachMessageHandler = require('./message-handler');
const { json } = require('body-parser');

const wsServer = new ws.Server({
    server: httpserver//,
    // port:   443//, 
    // clientTracking: true
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

// all files inside public are static and available to the frontend
app.use(express.static('public'));

// WIT STARTING POINT
// const fb_token = 'abc12345'
// const bot = new methods('EAAIidVs6fVYBAGGBrywkRKKXKyG8F2UGP2y6sZA7dcO29whI1HVjR6PrOxGzXJnDFbCZBMwE7nrnWEbzqsWnoHS8ZAqzaHrVD27BxdO1qZBlvPUvbtC6AZBRIRlGkfOPZAdHn3mwhfDAWRu5yUGrdvIjfnGrBNxo189seRG9UsuwZDZD')

// -------------------------------------------------
// Facebook connection config
// -------------------------------------------------
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
router.route('/chatbot/updateObjects')
.get((req, res) => {
    var data = fs.readFileSync(__dirname+'/json/actionObject50shorted.json'); 
    var actionObject50shorted = JSON.parse(data);

    var actionNames = Object.keys(actionObject50shorted);
    console.log(actionNames);

    actionNames.forEach(action => {
        let objects = actionObject50shorted[action];
        // console.log(`${action} ---> ${objects}`);
    });


    //////// HTTP Requests with axios
    async function updateWITentity(entityName, arrayOfKeywords) {
        // update the list of keywords of an entity
        const configRequest = {
            method: 'put',
            url: `https://api.wit.ai/entities/${entityName}?v=20210209`,
            headers: {
                "Authorization": `Bearer ${process.env.WIT_KEY}`,
                "Content-Type": "application/json"
            },
            data: {
                name: entityName,
                roles: [entityName],
                keywords: []
            }
        }
        arrayOfKeywords.forEach(newKeyword => {
            configRequest.data.keywords.push({"keyword": newKeyword, "synonyms": [newKeyword]});
        });
        
        // res.send(JSON.stringify(configRequest,null,2));

        let result = await axios(configRequest);

        console.log(result.data);   //DEBUG
    }

    try {
        updateWITentity("action",actionNames);
        actionNames.forEach(action => {
            let objects = actionObject50shorted[action];
            console.log(`${action} ---> ${objects}`);
            // updateWITentity("object",objects);
        });
    } catch (error) {
        console.error(error);
    }


    // res.send(JSON.stringify(actionObject50shorted,2));
});



module.exports = router;