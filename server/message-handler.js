const {Wit, log} = require('node-wit');

const ws        = require('ws');
const stringify = require('json-stringify-pretty-compact');

module.exports = function(wsServer) {
    //----------------------------------------------
    // Setting up our WIT.AI bot
    const wit = new Wit({
        accessToken: process.env.WIT_KEY,
        // actions,
        logger: new log.Logger(log.INFO),
        // LOGGER METHODS: debug, log, warn, error
        // param: message 
    });
    //----------------------------------------------
    // setting up our vars
    var scenario, step=1;
    // bool var, will be used to set when 
    // we will be listening to set the scenario
    // TODO: change the setting so the scenario can be changed anytime, not only at the beginning
    var listeningForScenarioSetup= true; 
    var inProgress_captureAction = false;
    var inProgress_captureObject = false;
    var sessionDone              = false;

    // types:   botMessage, guiMessage, setupScenarioStep, quickReplies
    // sender:  Server, Chatbot, GUI
    var socketJSONmsg = {
        type: "types",  
        text: "msgSent",
        sender: "Server"
    }
    function setupSocketMsg(type, sender, text) {
        socketJSONmsg.type  = type;
        socketJSONmsg.sender= sender;
        socketJSONmsg.text  = text;
    }
    function setupSocketMsg(type, text) {   // the sender is always Server
        socketJSONmsg.type  = type;
        socketJSONmsg.text  = text;
    }
    //----------------------------------------------
    // check if a JSON obj is empty
    function isEmptyObject(obj) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
          }
        }
        return true;
    }

    //----------------------------------------------
    // WIT SPEECH
    function speechToText(speech2textFile) {
        var witai_speech = require('witai-speech');
        
        witai_speech.ASR({
            file: './demo.wav', 
            developer_key: process.env.WIT_KEY,
            }, function (err, res) {
                console.log(err, res);
            });
    }
    //----------------------------------------------
    // Web Server Socket handling
    wsServer.on('connection', function connection(socket, req, client) {
        const clientIP = req.socket.remoteAddress;

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
        setupSocketMsg("botMessage", introMessage.value);
        socket.send(JSON.stringify(socketJSONmsg));

        const scenarioSetupMsg = "This is the start of a new session. So tell me, are your actions going to be hidden?";
        setupSocketMsg("botMessage", scenarioSetupMsg);
        socket.send(JSON.stringify(socketJSONmsg));
        // TODO: testing quick replies, separated by ; delimiter
        setupSocketMsg("quickReplies", "Yes;No");
        sendToClients(socketJSONmsg);
        sendMsgToWIT(scenarioSetupMsg);

        var userMsg, wit_Reply, botReply,
            wit_IntentName, wit_Traits, wit_TraitNames, 
            wit_Entities, wit_EntityNames;
        socket.on('message', message => {
            // console.log("---------------Client said:\n"+message);
            var msgFromClient = JSON.parse(message);
            // console.log("Client told me: "+message);
            console.log(`Received msg from client:${msgFromClient.sender} with IP: ${clientIP}`);
            
            // broadcast the message to all the clients
            wsServer.clients.forEach(client => {
                if (client !== socket && client.readyState === ws.OPEN) {
                    client.send(message);
                }
            });
            if (msgFromClient.sender == "Chatbot") {
                if (msgFromClient.type == "quickReplies") {
                    console.log(`Client:${msgFromClient.sender} said ${msgFromClient.text}`);
                    if (listeningForScenarioSetup && msgFromClient.text == "Yes") {
                        sendMsgToWIT("hidden action");
                    } else if (listeningForScenarioSetup && msgFromClient.text == "No") {
                        sendMsgToWIT("visible action");
                    } else if (sessionDone && msgFromClient.text == "Yes"){
                        sendMsgToWIT("refresh");
                    } else if (sessionDone && msgFromClient.text == "No") {
                        sendMsgToWIT("bye");
                    } else {
                        // TODO: handle this
                    }
                } else {
                    sendMsgToWIT(msgFromClient.text);
                }
            } else if (msgFromClient.sender == "GUI") {
                console.log("GUI TOLD ME: "+msgFromClient.text);
                var guiMsg = msgFromClient.text;
                if (guiMsg.includes("step") && guiMsg.includes("done")) {
                    step = guiMsg[guiMsg.indexOf("step")+4];
                    var botMsg1, botMsg2;
                    if (step == 1) {
                        botMsg1 = "Object captured! ";
                        if (scenario == 1) {
                            botMsg1 += "You can see the observed labels in the Vision window and the inferred object labels in the GG window. " 
                                    +  "There are also some future states for the object predicted by the reasoner.";
                            botMsg2  = "Now you can capture the action. Tell me when you are ready so I can start.";
                        } else {
                            botMsg1 += " You can see the observed labels in the Vision window.";
                            botMsg2  = "Now you can make some actions hidden from me and when you are ready tell me to take a new screenshot of the object.";
                        }
                        inProgress_captureObject = false;
                    } else {
                        if (scenario == 1) {
                            botMsg1 = "Your action has been captured! " 
                                    + "The observed labels can be seen in the Vision window and the inferred ones in the GG window. "
                                    + "The predicted state of your object is displayed by the Reasoner.";
                            inProgress_captureAction = false;
                        } else {
                            botMsg1 = "Object captured! "
                                    + "You can see the observed labels in the Vision window. "
                                    + "The reasoner now shows you its prediction of the actions that you might have made with the object.";
                            inProgress_captureObject = false;
                        }
                        botMsg2 = "The session is finished. Do you want to start a new one?";
                        sessionDone = true;
                    }
                    setupSocketMsg("botMessage", botMsg1);
                    sendToClients(socketJSONmsg);
                    setupSocketMsg("botMessage", botMsg2);
                    sendToClients(socketJSONmsg);
                    step++;
                    if (sessionDone) {
                        console.log("----> SESSION DONE");
                        setupSocketMsg("quickReplies", "Yes;No");
                        sendToClients(socketJSONmsg);
                    }
                }
            }    
        });

        // we want the server to speak to all the clients
        function sendToClients(data) {
            wsServer.clients.forEach(client => {
                client.send(JSON.stringify(data));
            })
        }

        // send message to wit and get reply
        function sendMsgToWIT(msg) {
            wit.message(msg, {})
                .then((data) => {
                    // console.log('Yay, got Wit.ai response:\n' + stringify(data,null,2));

                    handleChatbotReply(data);
                }) .catch(console.error);
        }

        var captActionBotMsg = "Alright, I'm recording your action. Please wait a few seconds for the results...";
        var captObjBotMsg    = "Alright, I'm taking a screenshot of the object. Please wait a few seconds for the results...";

        function handleChatbotReply(witResponse) {
            wit_Reply = witResponse;

            // if the message hasn't matched to any intent
            if (isEmptyObject(witResponse.intents)) {
                console.log("[wit] no intent matched!")
                log.ERROR = (`No intent matched input "${userMsg}"`);
                botReply = "I'm not sure I understand, can you try again?";
                botReply2= "If you need help type \"help\". If you want to start over you can ask me to start a new session by refreshing the page.";
                
                setupSocketMsg("botMessage", botReply);
                sendToClients(socketJSONmsg);
                setupSocketMsg("botMessage", botReply2);
                sendToClients(socketJSONmsg);
                return;
            }
            // if no entities have been found
            if (isEmptyObject(witResponse.entities)) {
                console.debug("[wit] no entities found!");
            } else { 
                wit_Entities = witResponse.entities; 
                wit_EntityNames = Object.keys(witResponse.entities);
            }
            if (isEmptyObject(witResponse.traits)) {
                console.debug("[wit] no traits found!");
            } else { 
                wit_Traits = witResponse.traits; 
                wit_TraitNames = Object.keys(witResponse.traits);
            }

            wit_IntentName = witResponse.intents[0].name;
            console.log("[wit intent] ", wit_IntentName);
            // console.log("[wit] entities: ", wit_Entities);
            // console.log("[wit] traits: ", wit_Traits);

            if (!isEmptyObject(wit_Traits)) {
                // use Object.keys to retrieve all traits
                // since trait names are not known beforehand
                for (i=0; i< wit_TraitNames.length; i++) {
                    console.log("[wit trait] ",wit_TraitNames[i], "\t", wit_Traits[wit_TraitNames[i]][0].value);
                }
            }
            
            botReply = ("triggered intent: ", wit_IntentName);  // TO BE DELETED
            //----------------------------------------------------
            // Handle bot replies according to triggered intents
            // ---> captureObject Intent
            if (wit_IntentName == 'captureObject') {
                if (scenario == 1 && step == 2) {
                    botReply = "You have already captured the object. Your next step is to capture one or more actions on the object.";
                    setupSocketMsg("botMessage", botReply);
                    sendToClients(socketJSONmsg);
                    return;
                } else { inProgress_captureObject = true; }
                if (listeningForScenarioSetup) {
                    botReply = "I'm still waiting for you to specify if the actions are going to be hidden or visible.";
                    setupSocketMsg('botMessage', botReply);
                    sendToClients(socketJSONmsg);
                    return;
                }
                botReply = captObjBotMsg;
            // ---> captureAction intent
            } else if (wit_IntentName == 'captureAction') {
                if (listeningForScenarioSetup) {
                    botReply = "I'm still waiting for you to specify if the actions are going to be hidden or visible.";
                    setupSocketMsg('botMessage', botReply);
                    sendToClients(socketJSONmsg);
                    return;
                }
                if (scenario == 1 && inProgress_captureObject) {
                    botReply = "Capturing of the object and its state has not finished yet.";
                    setupSocketMsg('botMessage', botReply);
                    sendToClients(socketJSONmsg);
                    return;
                } else if (scenario == 2) {
                    setupSocketMsg("botMessage", "I cannot capture actions while in the hidden actions scenario. You can start a new session and specify the visible actions scenario.");
                    sendToClients(socketJSONmsg);
                    return;
                } else { 
                    inProgress_captureAction = true; 
                    botReply = captActionBotMsg;
                }
            // ---> help intent
            } else if (wit_IntentName == 'help') {
                if (!scenario) {
                    botReply = "You haven't specified a scenario yet. Tell me if your action will be visible or hidden from me.";
                } else if (scenario == 1) {
                    botReply = "We are on the 1st scenario, where your actions on the object are visible to me.";
                    if (step == 1) {
                        botReply += "\nThe next step is for me to capture the starting state of the object.";
                    } else if (step == 2) {
                        botReply += "\nThe next step is for me to capture one or more actions that you do on the object.";
                    } 
                } else if (scenario == 2) {
                    botReply = "We are on the 2nd scenario, where your actions on the object are hidden.";
                    if (step == 1) {
                        botReply += "\nThe next step is for me to capture the starting state of the object.";
                    } else if (step == 2) {
                        botReply += "\nThe next step is for me to capture the state of the object after the actions that occurred.";
                    }
                }
            // ---> setActionVisibility intent
            } else if (wit_IntentName == 'setActionVisibility') {
                // set scenario and stop listening for any change
                // TODO: change this so it can be changed anytime
                var isHidden;
                // console.log("Listening? ", listeningForScenarioSetup);
                // console.log("entity included? ", wit_EntityNames.includes('actionVisibility:actionVisibility'));
                if (listeningForScenarioSetup) {
                    if (!isEmptyObject(wit_Entities) &&
                        wit_EntityNames.includes('actionVisibility:actionVisibility')) {
                            isHidden = wit_Entities['actionVisibility:actionVisibility'][0].value;
                            console.log("actionVisibility: ",isHidden);
                            if (isHidden == "hidden") {
                                scenario = 2;
                            } else {    // visible
                                scenario = 1;
                            }
                            step = 1;
                            listeningForScenarioSetup = false;
                    }
                    botReply = ("OK, so we are going with scenario "+scenario+" with "+isHidden+" action(s)."); 
                    setupSocketMsg("botMessage", botReply);
                    sendToClients(socketJSONmsg);
                    setupSocketMsg("setupScenarioStep", `scenario${scenario},step${step}`);
                    sendToClients(socketJSONmsg);
                    botReply = "The first step is to capture an object. Tell me when you are ready";
                } else {
                    botReply = "You can only change the running scenario at the start of the session for now. You can refresh the page for a new session.";
                }       
            // ---> askForActionVisibility intent         
            } else if (wit_IntentName == 'askActionVisibility') {
                // this is the step where the bot asks for the scenario setup
                // when this is triggered, 
                // we will set the boolean listening for the scenario setup
                // setupSocketMsg("botMessage", "I'm listening for scenario setup...");
                // socket.send(JSON.stringify(socketJSONmsg)); 
                listeningForScenarioSetup = true;
                sessionDone = false;
                return;
            // ---> ready intent
            // when the user says he's ready, what do we do?
            } else if (wit_IntentName == 'ready') {
                if (wit_EntityNames.includes('negation:negation')) {
                    botReply = "OK, no hurry, I'm ready when you are. If you require help, you can ask me for it.";
                    setupSocketMsg("botMessage", botReply);
                    sendToClients(socketJSONmsg);
                    return;
                }
                if (scenario == 1 && step == 2) {   // when ready to capture action
                    // inProgress_captureAction = true;
                    // botReply = captActionBotMsg;
                    sendMsgToWIT("capture action");
                    return;
                } else if (step == 1 || (scenario == 2 && step == 2)) {
                    // inProgress_captureObject = true;
                    // botReply = captObjBotMsg;
                    sendMsgToWIT("capture object");
                    return;
                }
            
            // ---> newSession intent
            } else if (wit_IntentName == 'newSession') {
                botReply = "Refreshing the page...";
            // ---> greeting intent
            } else if (wit_IntentName == 'greeting') { 
                if (wit_TraitNames.length && 
                    wit_TraitNames.includes('wit$greetings')) {
                        botReply = "Hello there!";
                }
            // ---> bye intent
            } else if (wit_IntentName == 'bye') {
                if (wit_TraitNames.length && 
                    wit_TraitNames.includes('wit$bye')) {
                    botReply = "Bye bye. See you later!"
                }
            }
            // console.log("--------\nLogger?\n",log);
            //----------------------------------------------------
            // send reply msg to chatbot
            // and then tell the GUI about the triggered intent
            setupSocketMsg("botMessage", botReply);
            sendToClients(socketJSONmsg);
            setupSocketMsg("guiMessage", wit_IntentName);
            sendToClients(socketJSONmsg);
        }
    });
}
