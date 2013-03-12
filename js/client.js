// closure-handlers
goog.events.listen(goog.dom.getElement('auth'), goog.events.EventType.CLICK, function(e) {
    send('auth', goog.dom.getElement('txtauth').value);
});

goog.events.listen(goog.dom.getElement('challenge'), goog.events.EventType.CLICK, function(e) {
    send('challenge', goog.dom.getElement('txtchallenge').value);
});

goog.events.listen(goog.dom.getElement('accept'), goog.events.EventType.CLICK, function(e) {
    send('accept', '88');
});




// check whether websockets are available
window.WebSocket = window.WebSocket || window.MozWebSocket;
if (!window.WebSocket) {
    alert("Your browser is a piece of shit (use Chrome 16+, Firefox 10+ or Safari 6+)");
    goog.style.showElement(goog.dom.getElement('main'), false);
}
var connection = new WebSocket('ws://127.0.0.1:2666');




// open-handler
connection.onopen = function () {
    alert("Connected to Websocket server succesfully");
};




// error-handler
connection.onerror = function (e) {
    alert("Error while trying to connect to Websocket server: " + e);
};




// message-handler
connection.onmessage = function (message) {
    // пробуем распарсить json
    try {
        var json = JSON.parse(message.data);
        console.log('>> Message received: ' + message.data);

        //обработка в зависимости от типа сообщения
        switch (json.type) {
            case 'challenge':
                goog.style.showElement(goog.dom.getElement('accept'), true);
                goog.dom.getElement('accept').value = 'Accept (' + json.data + ')';
                break;
            case 'active':
                alert('active! ' + json.data);
                break;
            case 'passive':
                alert('passive! ' + json.data);
                break;
            default:
                console.log("Unknown type: " + json.type);
        }
    } catch (e) {
        console.log('Error: ' + e.toString());
    }
};




// trying to connect in 4 seconds
var errorOccured = false;
setInterval(function() {
    if (connection.readyState === 1 || errorOccured) return;
    alert('Unable to comminucate with the WebSocket server.');
    errorOccured = true;
}, 4000);




// send function
function send(type, data) {
    connection.send(JSON.stringify({type: type, data: data}))
}
