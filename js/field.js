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
    var cellsDOM = [];
    goog.array.forEach(data, function(cell) {
        cellsDOM.push(goog.dom.createDom('div', {
            id: cell.x.toString() + '-' + cell.y,
            style: 'position: absolute; width: 20px; height: 20px; left: ' + (2+cell.x*22) + 'px; top: ' + (2+cell.y*22) + 'px; background-color: #4f8;'
        }, cell.data));
    });

    var fieldDOM = goog.dom.createDom('div', {
        id: 'field',
        style: 'position: relative; width: 222px; height: 222px; left: 100px; background-color: #5678e3;'
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
            goog.dom.getElement(data.x.toString() + '-' + data.y).innerHTML = data.data;
        } catch(e) {console.log(e.toString());}
    }
};
