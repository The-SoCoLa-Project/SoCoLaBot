// Cache all DOM elements
var chatForm = document.querySelectorAll('.chat-input-area');
var chatInputField = document.querySelectorAll('.chat-input-area__input');
var chatLog = document.querySelectorAll('.chat-log');
// Global loading indicator
var loading = false;

var quickReplies_btnActive = false;

// const GUIaddr = 'http://139.91.183.118:80/';
const GUIaddr = 'https://192.168.1.4:80/';

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
var SpeechRecognitionEvent  = SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
// false for just final results
recognition.interimResults = false;
// true for continuous results captured
// false for single result each time recognition is started
recognition.continuous = true;

recognition.onresult = function(e) {
    console.log("-------SPEECH RECOGNITION RESULT--------")
    if (e.results.length > 0) {
        // the transcript will provide the text output 
        // after the speech recognition service has stopped
        var last    = e.results.length - 1;
        var speech  = e.results[last][0].transcript;
        // var speech = event.results[0][0].transcript;
        console.log(speech);
    }

    // console.log('Confidence: ' + event.results[0][0].confidence);
    // // synthVoice("Hello");
    addUserMsg(speech);
    // send the usermsg to the server via the websocket
    if (quickReplies_btnActive) {
        if (speech.toUpperCase() == "YES" || speech.toUpperCase() == "NO") {
            sendMsg("quickReplies",speech)
            $(".quick-replies_wrapper").remove();
            quickReplies_btnActive = false;
            return;
        } 
    } 
    sendMsg("botMessage",speech);
}

recognition.onspeechend = function() {
    recognition.stop();
    console.log('speech rec stopped')
}
recognition.onerror = function(event) {
    console.error('Error occurred in recognition: ' + event.error);
}

function synthVoice(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = text;
    synth.speak(utterance);
}


/**********************************************
 * Ask browser for permission to use mic
 */
function permission_askForMic() {
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
        console.log('You let me use your mic!')
    })
    .catch(function(err) {
        console.log('No mic for you!')
    });
}


/**********************************************
 * WebSocket Setup
 */

// const socket = new WebSocket("wss://139.91.183.118:3000");
const socket = new WebSocket("wss://192.168.1.4");

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
    permission_askForMic();
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
    // after receiving msg from bot, listen for new user input
    // recognition.start();
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

// Handle form submit (clicking on the submit button or pressing Enter)
chatForm[0].addEventListener('submit', function(e) {
    e.preventDefault();

    var text = chatInputField[0].value;

    // If reply is loading, wait
    if (loading) { return false; }

    // Catch empty messages
    if (!text) { return false; }

    // Add user's message to the chat log
    addUserMsg(text);

    // Clear input
    chatInputField[0].value = '';

    if (quickReplies_btnActive) {
        if (text.toUpperCase() == "YES" || text.toUpperCase() == "NO") {
            sendMsg("quickReplies",text)
            $(".quick-replies_wrapper").remove();
            quickReplies_btnActive = false;
            return;
        }
    } 
    // send the usermsg to the server via the websocket
    sendMsg("botMessage",text);
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

        quickReplies_btnActive = true;
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

