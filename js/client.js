var websocket = new ru.tomtrix.othello.Websocket('ws://127.0.0.1:2666');
var user = null;

goog.events.listen(goog.dom.getElement('auth'), goog.events.EventType.CLICK, function(e) {
    var name = goog.dom.getElement('txtauth').value;
    websocket.send('auth', name);
    user = new ru.tomtrix.othello.User(name, websocket);
    e.preventDefault();
});

goog.events.listen(goog.dom.getElement('challenge'), goog.events.EventType.CLICK, function(e) {
    websocket.send('challenge', goog.dom.getElement('txtchallenge').value);
    e.preventDefault();
});

goog.events.listen(goog.dom.getElement('accept'), goog.events.EventType.CLICK, function(e) {
    websocket.send('accept', '88');
    e.preventDefault();
});

websocket.addHandler("ok", function(data) {
    console.log('ok ' + data);
});

websocket.addHandler("error", function(data) {
    console.log('server internal error: ' + data);
});

websocket.addHandler("challenge", function(data) {
    goog.style.showElement(goog.dom.getElement('accept'), true);
    goog.dom.getElement('accept').innerHTML = 'Accept (' + data + ')';
});

websocket.addHandler("active", function(data) {
    if (user==null) return;
    user.updateField(data);
    user.setActive(true);
    websocket.send("score", null);
});

websocket.addHandler("passive", function(data) {
    if (user==null) return;
    user.updateField(data);
    user.setActive(false);
    websocket.send("score", null);
});

websocket.addHandler("finish", function(data) {
    if (user==null) return;
    user.updateField(data);
    user.setActive(false);
});

websocket.addHandler("score", function(data) {
    goog.dom.getElement('score').innerHTML = data.mine + "/" + data.his + '(' + Math.ceil(100*data.percent) + '%)'
});
