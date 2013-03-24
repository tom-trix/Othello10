var websocket = new ru.tomtrix.othello.Websocket('ws://46.146.231.100:7703');
var user = null;
var table = null;
var _score = -1;

var getStatus = function(state, name) {
    switch (state) {
        case 0: return goog.dom.createDom('div', null, '–');
        case 1:
            var t = goog.dom.createDom('a', {href: '', style: 'color: darkblue; font-weight: bold;'}, 'online');
            goog.events.listen(t, goog.events.EventType.CLICK, function(e) {
                websocket.send('challenge', name);
                e.preventDefault();
            });
            return t;
        default: return goog.dom.createDom('div', null, 'n/a');
    }
};

var changeTurn = function(active) {
    goog.array.forEach(goog.dom.getElementsByClass('battle'), function(item) {
        goog.style.showElement(item, true);
    });
    var turn = goog.dom.getElement('turn');
    turn.innerHTML = active ? 'Ваш ход' : 'Ход противника';
    goog.dom.classes.enable(turn, 'turn-on', active);
    goog.dom.classes.enable(turn, 'turn-off', !active);
};

websocket.addHandler("ok", function(data) {
    console.log('ok ' + data);
});

websocket.addHandler('error', function(data) {
    console.log('server internal error: ' + data);
});

websocket.addHandler('challenge', function(data) {
    var t = 5;
    var dialog = new goog.ui.Dialog(null, true);
    dialog.setContent('<p>' + data + ' желает сразиться с вами! Принять вызов?</p><p style="text-align: right">' + t + ' сек.</p>');
    dialog.setButtonSet(goog.ui.Dialog.ButtonSet.createYesNo());
    dialog.setTitle('Вызов на бой');
    var timer = -1;
    function escape() {
        clearTimeout(timer);
        websocket.send('escape', null);
        dialog.setVisible(false);
    }
    timer = setInterval(function() {
        if (t > 0)
            goog.dom.getChildren(dialog.getContentElement())[1].innerHTML = (--t) + ' сек.';
        else escape();
    }, 1000);
    goog.events.listen(dialog, goog.ui.Dialog.EventType.SELECT, function(e) {
        if (e.key == 'yes') {
            clearTimeout(timer);
            websocket.send('accept', null);
        }
        else escape();
    });

    dialog.setVisible(true);
});

websocket.addHandler('active', function(data) {
    goog.style.showElement(table, false);
    changeTurn(true);
    user.updateField(data);
    user.setActive(true);
});

websocket.addHandler('passive', function(data) {
    goog.style.showElement(table, false);
    changeTurn(false);
    user.updateField(data);
    user.setActive(false);
});

websocket.addHandler('finish', function(data) {
    user.updateField(data);
    var dialog = new goog.ui.Dialog(null, true);
    dialog.setContent(_score > 50 ? 'Вы выиграли!' : _score < 50 ? 'Вы проиграли...' : 'Ничья...');
    dialog.setButtonSet(goog.ui.Dialog.ButtonSet.createOk());
    dialog.setTitle('Game over');
    goog.events.listen(dialog, goog.ui.Dialog.EventType.SELECT, function(e) {
        console.log(e);
        user.finish();
    });
    setTimeout(function() {
        try {
            user.finish();
            dialog.setVisible(false);
        } catch (e) {console.log(e);}
    }, 4500);
    dialog.setVisible(true);
    _score = -1;
});

websocket.addHandler('score', function(data) {
    _score = Math.round(100*data.percent);
    goog.dom.getElement('score').innerHTML = 'Score: ' + data.mine + "/" + data.his + '(' + _score + '%)'
});

websocket.addHandler('rating', function(data) {
    if (table != null)
        goog.dom.removeNode(table);

    var headers = ['Имя', 'Онлайн', 'Всего', 'Побед', 'Ничьих', 'Поражений', 'Рейтинг (%)'];
    table = goog.dom.createDom('table', {class: 'center'});
    var header = table.insertRow(-1);
    goog.array.forEach(headers, function(item) {
        var cell = header.insertCell(-1);
        goog.dom.classes.set(cell, 'th');
        cell.innerHTML = item;
    });
    goog.array.forEach(data, function(item) {
        var row = table.insertRow(-1);
        row.insertCell(-1).innerHTML = item.name;
        goog.dom.appendChild(row.insertCell(-1), getStatus(item.state, item.name));
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
            user = new ru.tomtrix.othello.User(name, websocket);
            goog.dom.getElement('hello').innerHTML = 'Hello, ' + name + '!';
        }
    });
    dialog.setVisible(true);
    input.focus();

}, 100);
