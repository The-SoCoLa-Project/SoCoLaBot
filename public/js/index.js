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

/**
 * Create a DOM element from a string value
 * @function getMessageElement 
 * @param {string} val
 * @param {boolean} isUser
 * @returns {HTMLElement}
*/
function getMessageElement(val, isUser) {
    // Create parent message element to append all inner elements
    var newMessage = document.createElement('div');
    
    // Add message variation class when the message belongs to the user
    if (isUser) {
        newMessage.className += 'chat-message--right ';
    }

    // Create text
    var text = document.createElement('p');
    text.append(val);
    text.className += 'chat-message__text';

    // Append elements
    newMessage.append(text);
    newMessage.className += 'chat-message ';

    return newMessage;
}


// Handle form submit (clicking on the submit button or pressing Enter)
chatForm[0].addEventListener('submit', function(e) {
    e.preventDefault();

    // If reply is loading, wait
    if (loading) {
        return false;
    }

    // Catch empty messages
    if (!chatInputField[0].value) {
        return false;
    }

    // Add user's message to the chat log
    var newMessage = getMessageElement(chatInputField[0].value, true);
    chatLog[0].append(newMessage);

    // Scroll to last message
    scrollContents(chatLog[0]);

    // Get the reply from dialogflow.com
    // getReply(chatInputField[0].value);

    // Clear input
    chatInputField[0].value = '';
});
