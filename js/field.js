goog.provide('ru.tomtrix.othello.Field');

goog.require('goog.dom');
goog.require('goog.style');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventType');

/**
 * feef
 * @param data
 * @param websocket
 * @constructor few
 */
ru.tomtrix.othello.Field = function(data, websocket) {
    const h=70; //image size
    function getImage(value) {
        return 'img/' + (value=='A' ? 'black' : value=='V' ? 'white' : 'blank') + '.png';
    }

    var cellsDOM = [];
    goog.array.forEach(data, function(cell) {
        cellsDOM.push(goog.dom.createDom('img', {
            id: cell.x.toString() + '-' + cell.y,
            src: getImage(cell.data),
            style: 'position: absolute; width: ' + h + 'px; height: ' + h + 'px; left: ' + (1+cell.x*(h+1)) + 'px; top: ' + (1+cell.y*(h+1)) + 'px; border-width: 1px; border: solid #111;'
        }));
    });

    var H = (2+h)*Math.sqrt(data.length); //full field size
    var fieldDOM = goog.dom.createDom('div', {
        id: 'field',
        style: 'position: relative; width: ' + (H+2) + 'px; height: ' + (H+2) + 'px; left: 100px; background-color: #c9daef; border: solid 7px #111; border-radius: 10px;'
    }, cellsDOM);
    goog.dom.appendChild(goog.dom.getElement('main'), fieldDOM);

    function step(e) {
        var coords = e.currentTarget.id.split('-');
        websocket.send("step", {x: (coords[0]>>0), y: (coords[1]>>0)});
    }

    this.enable = function() {
        goog.array.forEach(cellsDOM, function(cell) {
            goog.events.listen(cell, goog.events.EventType.CLICK, step);
        });
    };

    this.disable = function() {
        goog.array.forEach(cellsDOM, function(cell) {
            goog.events.unlisten(cell, goog.events.EventType.CLICK, step);
        });
    };

    this.changeValue = function(data) {
        try {
            var item = goog.dom.getElement(data.x.toString() + '-' + data.y);
            item.setAttribute('src', getImage(data.data));
        } catch(e) {console.log(e.toString());}
    }
};
