goog.provide('ru.tomtrix.othello.Websocket');

goog.require('goog.dom');

/**
 * Websocket
 * @param {string} address websocket address like 'ws://46.146.231.100:7703'
 * @constructor
 */
ru.tomtrix.othello.Websocket = function(address) {

    // check whether websockets are available
    if (!window['WebSocket']) {
        alert('Your browser is a piece of shit (use Chrome 16+, Firefox 10+ or Safari 6+)');
        goog.style.showElement(goog.dom.getElement('main'), false);
    }

    // trying to connect in 4 seconds
    /** @type {boolean} */
    var errorOccured = false;
    setInterval(function() {
        if (connection.readyState === 1 || errorOccured) return;
        alert('Unable to comminucate with the WebSocket server...');
        errorOccured = true;
    }, 4000);

    /** Map of handlers name -> Function
     * @type {Array} */
    var handlers = [];

    /** websocket connection
     * @type {WebSocket} */
    var connection = new WebSocket(address);

    // open-handler
    connection.onopen = function () {
        window.console.log("Connected to Websocket server succesfully");
    };

    // error-handler
    connection.onerror = function (e) {
        alert("Error while trying to connect to Websocket server: " + e);
    };

    connection.onmessage = function (message) {
        try {
            window.console.log('>> Message received: ' + message.data);
            var json = window.JSON.parse(message.data);
            var f = handlers[json.type];
            if (f!=null)
                f(json.data);
            else window.console.log("Unknown type: " + json.type);
        } catch (e) {
            window.console.log('Error: ' + e.toString());
        }
    };

    /** Sends data to the server
     * @param {string} type
     * @param {string|null} data */
    this.send = function (type, data) {
        window.console.log('Try to send: type = ' + type + '; data = ' + data);
        connection.send(window.JSON.stringify({type: type, data: data}))
    };

    /** Adds handler to the websocket
     * @param {string} type
     * @param {Function} func1 */
    this.addHandler = function(type, func1) {
        handlers[type] = func1;
    }
};
