// Cache all DOM elements
var chatForm = document.querySelectorAll('.chat-input-area');
var chatInputField = document.querySelectorAll('.chat-input-area__input');
var chatLog = document.querySelectorAll('.chat-log');
// Global loading indicator
var loading = false;

/**
 * Scrolls the contents of a container to the bottom
 * @function scrollContents 
*/
function scrollContents(container) {
    container.scrollTop = container.scrollHeight;
}

var responseMsg = "";

/***********************
 * WebSocket Setup
 */
const socket = new WebSocket("ws://192.168.1.6:3000");

socket.onopen = () => {
    console.log("Connected to WS Server");
}
socket.onmessage = (event) => {
    console.log("Message from server: ", event.data);
    addBotMsg(event.data);
}
socket.onclose = (event) => {
    if (event.wasClean) {
        console.log(`[CLOSE] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        console.error(`[CLOSE ERROR] Connection died, code=${event.code}`);
    }
}
socket.onerror = (error) => {
    console.error(`[ERROR] ${error.message}`);
}
const sendMsg = (msgToSend) => {
    socket.send(msgToSend);
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
