goog.provide('ru.tomtrix.othello.Websocket');

goog.require('goog.dom');

ru.tomtrix.othello.Websocket = function(address) {
    // check whether websockets are available
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    if (!window.WebSocket) {
        alert('Your browser is a piece of shit (use Chrome 16+, Firefox 10+ or Safari 6+)');
        goog.style.showElement(goog.dom.getElement('main'), false);
    }
    var connection = new WebSocket(address); //'ws://127.0.0.1:2666'

    // open-handler
    connection.onopen = function () {
        console.log("Connected to Websocket server succesfully");
    };

    // error-handler
    connection.onerror = function (e) {
        alert("Error while trying to connect to Websocket server: " + e);
    };

    // message-handler
    var handlers = new Number();
    connection.onmessage = function (message) {
        try {
            console.log('>> Message received: ' + message.data);
            var json = JSON.parse(message.data);
            var f = handlers[json.type];
            if (f!=null)
                f(json.data);
            else console.log("Unknown type: " + json.type);
        } catch (e) {
            console.log('Error: ' + e.toString());
        }
    };

    // trying to connect in 4 seconds
    var errorOccured = false;
    setInterval(function() {
        if (connection.readyState === 1 || errorOccured) return;
        alert('Unable to comminucate with the WebSocket server...');
        errorOccured = true;
    }, 4000);

    /**
     *
     * @param type {String}
     * @param data {Object}
     */
    this.send = function (type, data) {
        console.log('Try to send: type = ' + type + '; data = ' + data);
        connection.send(JSON.stringify({type: type, data: data}))
    };

    /**
     * Adds handler to the websocket
     * @param {String} type
     * @param {Function} func1
     */
    this.addHandler = function(type, func1) {
        handlers[type] = func1;
    }
};
