var websocket = new ru.tomtrix.othello.Websocket('ws://127.0.0.1:2666');
var user = null;

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

websocket.addHandler('error', function(data) {
    console.log('server internal error: ' + data);
});

websocket.addHandler('challenge', function(data) {
    goog.style.showElement(goog.dom.getElement('accept'), true);
    goog.dom.getElement('accept').innerHTML = 'Accept (' + data + ')';
});

websocket.addHandler('active', function(data) {
    if (user==null) return;
    user.updateField(data);
    user.setActive(true);
});

websocket.addHandler('passive', function(data) {
    if (user==null) return;
    user.updateField(data);
    user.setActive(false);
});

websocket.addHandler('finish', function(data) {
    if (user==null) return;
    user.updateField(data);
    user.setActive(false);
});

websocket.addHandler('score', function(data) {
    goog.dom.getElement('score').innerHTML = data.mine + "/" + data.his + '(' + Math.ceil(100*data.percent) + '%)'
});

var table = null;
websocket.addHandler('rating', function(data) {
    if (table != null)
        goog.dom.removeNode(table);

    var headers = ['Имя', 'Онлайн', 'Всего', 'Побед', 'Ничьих', 'Поражений', 'Рейтинг (%)'];
    table = goog.dom.createDom('table');
    var header = table.insertRow(-1);
    goog.array.forEach(headers, function(item) {
        var cell = header.insertCell(-1);
        goog.dom.classes.set(cell, 'th');
        cell.innerHTML = item;
    });
    goog.array.forEach(data, function(item) {
        var row = table.insertRow(-1);
        row.insertCell(-1).innerHTML = item.name;
        row.insertCell(-1).innerHTML = item.state;
        row.insertCell(-1).innerHTML = item.games;
        row.insertCell(-1).innerHTML = item.wins;
        row.insertCell(-1).innerHTML = item.deadheats;
        row.insertCell(-1).innerHTML = item.loses;
        row.insertCell(-1).innerHTML = item.percent;
    });
    goog.dom.appendChild(goog.dom.getElement('main'), table);
});

setTimeout(function() {
    var dialog = new goog.ui.Dialog(null, true);
    dialog.setContent('<input id="entername" label="input your name here..."/>');
    dialog.setButtonSet(goog.ui.Dialog.ButtonSet.createOk());
    dialog.setTitle('Введите имя');
    var input = goog.dom.getChildren(dialog.getContentElement())[0];
    (new goog.ui.LabelInput).decorate(input);
    goog.events.listen(dialog, goog.ui.Dialog.EventType.SELECT, function(e) {
        var name = input.value.trim();
        if (name == '') {
            alert('Имя не может быть пустым');
            e.preventDefault();
        }
        else if (name.indexOf('<') >= 0) {
            alert('Имя содержит недопустимые символы');
            e.preventDefault();
        }
        else if (name.length > 20) {
            alert('Длина имени не должна превышать 20 символов');
            e.preventDefault();
        }
        else {
            websocket.send('auth', name);
            websocket.send('rating', null);
            user = new ru.tomtrix.othello.User(name, websocket);
        }
    });
    dialog.setVisible(true);
    input.focus();

}, 100);

