const {Wit, log} = require('node-wit');

const stringify = require('json-stringify-pretty-compact');

module.exports = function(wsServer) {
    //-----------------------------------
    // Setting up our WIT.AI bot
    const wit = new Wit({
        accessToken: process.env.WIT_KEY,
        // actions,
        logger: new log.Logger(log.INFO),
    });
    //------------------------------------
    // setting up our vars
    var scenario, step;
    //------------------------------------

    wsServer.on('connection', socket => {

        const introMsg = [
            "Hello. I'm SoCoLaBot! I'm here to assist you :)"
        ];
        // TODO: can add different intro messages later and choose randomly everytime

        // Generate a random number based on the length of the array
        const introMessage = {
            value: introMsg[Math.floor(Math.random() * introMsg.length)],
            id: -1,
            timestamp: new Date(),
        };
        socket.send(introMessage.value);

        var userMsg, 
            wit_Reply, wit_IntentName, wit_IntentID;
        socket.on('message', message => {
            userMsg = message;
            console.log("WS user said: ", userMsg)

            // send message to wit and get reply
            wit.message(userMsg, {})
                .then((data) => {
                    console.log('Yay, got Wit.ai response:\n' + stringify(data,null,2));


                    handleChatbotReply(data);
                })
                .catch(console.error);

            // socket.send(`You said: ${userMsg}`);
        });

        function handleChatbotReply(witResponse) {
            wit_Reply = witResponse;
            if (!witResponse.intents[0]) {
                console.log("[wit] no intent matched!")
            } else {
                wit_IntentName = witResponse.intents[0].name;
                console.log("[wit intent] ", wit_IntentName);

                if (wit_IntentName == 'captureObject') {

                } else if (wit_IntentName == 'captureAction') {

                } else if (wit_IntentName == 'help') {
                    
                } else if (wit_IntentName == 'setActionVisibility') {

                } else if (wit_IntentName == 'askActionVisibility') {

                } else if (wit_IntentName == 'newSession') {

                } else if (wit_IntentName == 'greeting') {

                } else if (wit_IntentName == 'bye') {
                    
                }

                socket.send(wit_IntentName);
            }
        }
    });
}
