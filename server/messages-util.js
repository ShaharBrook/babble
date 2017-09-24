var messages = [];
var id = 42;
function addMessage(message) {
    messages.push({
        id: id,
        message: message
    });
    return id++;
}
function getMessages(counter) {
    return messages.slice(counter,messages.length).map(parseMessage).map(parseMessage2);
}
function getMessages2(counter) {
    return messages.slice(counter,messages.length).map(parseMessage);
}
function doesIdExist(id) {
    return messages.filter(x => x.id == id).length > 0;
}
function getLength() {
    ;//console.log('From Utils: messages.length = '+messages.length);
    return messages.length;
}
function deleteMessage(id) {
    id = parseInt(id);
    messages = messages.filter(x => x.id != id);
}
function parseMessage(x) {
    return {
        id: x.id,
        name: x.message.name,
        email: x.message.email,
        message: x.message.message,
        timestamp: x.message.timestamp
    };
}
function parseMessage2(x) {
    return {message: x.message};
}
module.exports = {addMessage,getMessages,getMessages2,getLength,deleteMessage,doesIdExist};