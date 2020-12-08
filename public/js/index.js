// Cache all DOM elements
var chatForm = document.querySelectorAll('.chat-input-area');
var chatInputField = document.querySelectorAll('.chat-input-area__input');
var chatLog = document.querySelectorAll('.chat-log');
// Global loading indicator
var loading = false;

const GUIaddr = 'http://192.168.1.6:443/';

/**
 * Scrolls the contents of a container to the bottom
 * @function scrollContents 
*/
function scrollContents(container) {
    container.scrollTop = container.scrollHeight;
}


/***********************
 * WebSocket Setup
 */
const socket = new WebSocket("ws://192.168.1.6:3000");

var socketJSONmsg = {
    type: "types",
    text: "msgSent",
    sender: "botORserverORgui"
}
// The sender will always be the Chatbot from here
function setupJSONmsg(type, text) {
    socketJSONmsg.type  = type;
    socketJSONmsg.sender= "Chatbot",
    socketJSONmsg.text  = text;
}

socket.onopen = () => {
    console.log("[BOT] Connected to WS Server");
}
socket.onmessage = (event) => {
    var msg = JSON.parse(event.data);
    var botMsg = msg.text;
    // if (event.data.value) {
    //     botMsg = event.data.value;
    // }
    if (msg.sender == "Server" && msg.type == "botMessage") {
        addBotMsg(botMsg);
    }
}
socket.onclose = (event) => {
    if (event.wasClean) {
        console.log(`[WS BOT CLOSE] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        console.error(`[WS BOT CLOSE ERROR] Connection died, code=${event.code}`);
    }
}
socket.onerror = (error) => {
    console.error(`[WS BOT ERROR] ${error.message}`);
}
const sendMsg = (msgToSend) => {
    setupJSONmsg("botMessage", msgToSend);
    socket.send(JSON.stringify(socketJSONmsg));
}

/*****************************************************************************
 * USER MESSAGES
 *****************************************************************************/

/******* Add user message
 * Create a DOM element from a string value
 * @function getMessageElement 
 * @param {string} val
 * @param {boolean} isUser
 * @returns {HTMLElement}
*/
function getMessageElement(val, isUser) {
    // Create parent message element to append all inner elements
    var newUserMessage = document.createElement('div');
    
    // Add message variation class when the message belongs to the user
    if (isUser) {
        newUserMessage.className += 'chat-message--right ';
    }

    // Create text
    var text = document.createElement('p');
    text.append(val);
    text.className += 'chat-message__text';

    // Append elements
    newUserMessage.append(text);
    newUserMessage.className += 'chat-message ';

    return newUserMessage;
}

// add user message to UI
function addUserMsg(msg) {
    // Add user's message to the chat log
    var newUserMessage = getMessageElement(msg, true);
    chatLog[0].append(newUserMessage);
    // Scroll to last message
    scrollContents(chatLog[0]);
}

// jquery request to get user msg (if exists) from the Server
var receiveUserMsg = () => $.get("./api/chatbot/userMsg")
.fail((err)=>{
    console.error(err,": Failed to receive user message from chatbot server");
})
.done((data)=>{
    console.log('success');
    console.log("-->User msg:",data);
    addUserMsg(data);
})

var sendUserMsg = (msg) => 
$.post("./api/chatbot/userMsg", {userMsg: msg})
.fail((err)=>{
    console.error(err,": Failed to send the user message!")
})
.done((data)=>{
    console.log("User msg sent successfully!")
    // TODO: 
});

// Handle form submit (clicking on the submit button or pressing Enter)
chatForm[0].addEventListener('submit', function(e) {
    e.preventDefault();

    // If reply is loading, wait
    if (loading) { return false; }

    // Catch empty messages
    if (!chatInputField[0].value) { return false; }

    // Add user's message to the chat log
    addUserMsg(chatInputField[0].value);

    // send the usermsg to the server via the websocket
    sendMsg(chatInputField[0].value);
    // sendUserMsg(chatInputField[0].value);

    // receiveUserMsg();
    // receiveBotMsg();

    // Get the reply from wit.ai
    // getReply(chatInputField[0].value);

    // Clear input
    chatInputField[0].value = '';
});


/*****************************************************************************
 * CHATBOT MESSAGES/REPLIES
 *****************************************************************************/
// jquery request to get bot msg from the Server
var receiveBotMsg = () => $.get("./api/chatbot/getBotMsg")
.fail((err)=>{
    console.error(err,": Failed to receive bot message from chatbot server");
})
.done((data)=>{
    console.log('success');
    console.log("-->Bot msg:",data);
    addBotMsg(data);
})

// add bot message to UI
function addBotMsg(msg) {
    // Add user's message to the chat log
    var newBotMessage = getMessageElement(msg, false);  // true is user, false is bot
    chatLog[0].append(newBotMessage);
    // Scroll to last message
    scrollContents(chatLog[0]);
}

function handleWitReply(witIntent) {
    if (witIntent == 'captureObject') {
        // TODO: get scenario and step
        var scenario = 1, step = 1;
        var link = `${GUIaddr}api/controller/getObjLabels?scenario=${scenario}&step=${step}`;
        console.log(link);
        const getObjlabels = () => $.get(link)
        .done(function(){
            console.log("Scenario: " + scenario + "\t" + "Step: " + step);
            console.log("Object Labels received!");
        });
        getObjlabels();
    }
}