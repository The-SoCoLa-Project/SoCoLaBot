// Cache all DOM elements
var chatForm = document.querySelectorAll('.chat-input-area');
var chatInputField = document.querySelectorAll('.chat-input-area__input');
var chatLog = document.querySelectorAll('.chat-log');
// Global loading indicator
var loading = false;

// const GUIaddr = 'http://139.91.183.118:443/';
const GUIaddr = 'http://192.168.1.3:443/';

/**
 * Scrolls the contents of a container to the bottom
 * @function scrollContents 
*/
function scrollContents(container) {
    container.scrollTop = container.scrollHeight;
    container.style.paddingBottom = "5px";
}

/***********************
 * Speech Recognition
 */
// Speech recognition interface is an object of the browser’s window. 
// In Chrome: webkitSpeechRecognition, Firefox: SpeechRecognition
const SpeechRecognition     = window.SpeechRecognition || window.webkitSpeechRecognition;
// var SpeechGrammarList       = SpeechGrammarList || webkitSpeechGrammarList
var SpeechRecognitionEvent  = SpeechRecognitionEvent || webkitSpeechRecognitionEvent
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false;

recognition.onresult = function(event) {
    console.log("-------RECOGNITION RESULT--------")
    if (event.results.length > 0) {
        // the transcript will provide the text output 
        // after the speech recognition service has stopped
        var speech = event.results[0][0].transcript;
        console.log(speech);
        alert(speech);
    }
    
    // let last = e.results.length - 1;
    // let text = e.results[last][0].transcript;

    // console.log('Confidence: ' + e.results[0][0].confidence);
    // // synthVoice("Hello");
    // addUserMsg(speech);
}

function synthVoice(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = text;
    synth.speak(utterance);
}


/***********************
 * WebSocket Setup
 */
// const socket = new WebSocket("ws://139.91.183.118:3000");
const socket = new WebSocket("ws://192.168.1.3:3000");

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
    recognition.start();
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
    if (msg.sender == "Server" && msg.type == "quickReplies") {
        // msg.text is a string, we should convert it to array for the function to work
        var repliesArray = msg.text.split(";");
        addQuickReplies(repliesArray);
        addEventListener_toTheWrapper(document.querySelectorAll('.quick-replies_wrapper'));
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
const sendMsg = (msgType,msgToSend) => {
    setupJSONmsg(msgType, msgToSend);
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
// var receiveUserMsg = () => $.get("./api/chatbot/userMsg")
// .fail((err)=>{
//     console.error(err,": Failed to receive user message from chatbot server");
// })
// .done((data)=>{
//     console.log('success');
//     console.log("-->User msg:",data);
//     addUserMsg(data);
// })

// var sendUserMsg = (msg) => 
// $.post("./api/chatbot/userMsg", {userMsg: msg})
// .fail((err)=>{
//     console.error(err,": Failed to send the user message!")
// })
// .done((data)=>{
//     console.log("User msg sent successfully!")
//     // TODO: 
// });

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
    sendMsg("botMessage",chatInputField[0].value);
    // sendUserMsg(chatInputField[0].value);

    // receiveUserMsg();
    // receiveBotMsg();

    // Get the reply from wit.ai
    // getReply(chatInputField[0].value);

    // Clear input
    chatInputField[0].value = '';
});

/*****************************************************************************
 * QUICK REPLIES HANDLER
 * ---> param replies is an array of the button replies to be generated
 *****************************************************************************/
function addQuickReplies(replies) {
    if (Array.isArray(replies)) {
        // create a div for all the btns/replies
        var quickRepliesArea = document.createElement('div');
        quickRepliesArea.className = 'quick-replies_wrapper';

        replies.forEach(replyText => {
            var replyBtn = document.createElement('button');
            replyBtn.append(replyText);
            replyBtn.className = 'quick-reply__btn';

            // Append the btn into the div
            quickRepliesArea.append(replyBtn);
        })
        // Add the quick replies div to the chat log
        chatLog[0].append(quickRepliesArea);
        // Scroll to last message
        scrollContents(chatLog[0]);
    }
}

// https://javascript.info/bubbling-and-capturing
// catch all the events inside the div wrapping the quick-reply buttons
// the event listener needs to be added AFTER the element has been created
function addEventListener_toTheWrapper(wrapper) {
    wrapper[0].addEventListener('click', (event) => {
        // check if the click was on a button and not the div
        const isButton = event.target.nodeName === 'BUTTON';
        if (!isButton) { return; }

        // use JQuery's text function
        var btnText = $(event.target).text();

        console.log("Button's text: "+btnText);

        addUserMsg(btnText);
        sendMsg("quickReplies",btnText); 
        
        // after the reply is send, remove the whole div
        $(".quick-replies_wrapper").remove();
    });
}



/*****************************************************************************
 * CHATBOT MESSAGES/REPLIES
 *****************************************************************************/
// jquery request to get bot msg from the Server
// var receiveBotMsg = () => $.get("./api/chatbot/getBotMsg")
// .fail((err)=>{
//     console.error(err,": Failed to receive bot message from chatbot server");
// })
// .done((data)=>{
//     console.log('success');
//     console.log("-->Bot msg:",data);
//     addBotMsg(data);
// })

// add bot message to UI
function addBotMsg(msg) {
    // Add user's message to the chat log
    var newBotMessage = getMessageElement(msg, false);  // true is user, false is bot
    chatLog[0].append(newBotMessage);
    // Scroll to last message
    scrollContents(chatLog[0]);
}

// function handleWitReply(witIntent) {
//     if (witIntent == 'captureObject') {
//         // TODO: get scenario and step
//         var scenario = 1, step = 1;
//         var link = `${GUIaddr}api/controller/getObjLabels?scenario=${scenario}&step=${step}`;
//         console.log(link);
//         const getObjlabels = () => $.get(link)
//         .done(function(){
//             console.log("Scenario: " + scenario + "\t" + "Step: " + step);
//             console.log("Object Labels received!");
//         });
//         getObjlabels();
//     }
// }

