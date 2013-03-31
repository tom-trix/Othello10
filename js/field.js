goog.provide('ru.tomtrix.othello.Field');

goog.require('goog.dom');
goog.require('goog.style');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventType');

/**
 * Field
 * @param {Array} data
 * @param {ru.tomtrix.othello.Websocket} websocket
 * @constructor
 */
ru.tomtrix.othello.Field = function(data, websocket) {
    /** image size
     * @const
     * @type {number} */
    var h=70;

    /** full field size
     * @const
     * @type {number}
     */
    var H = (2+h)*Math.sqrt(data.length);

    /** DOM-Elements of stones
     * @type {Array} */
    var cellsDOM = [];

    goog.array.forEach(data, function(cell) {
        cellsDOM.push(goog.dom.createDom('img', {
            'id': cell.x.toString() + '-' + cell.y,
            'src': getImage(cell.data),
            'style': 'position: absolute; width: ' + h + 'px; height: ' + h + 'px; left: ' + (1+cell.x*(h+1)) + 'px; top: ' + (1+cell.y*(h+1)) + 'px; border-width: 1px; border: solid #111;'
        }));
    });

    goog.dom.appendChild(goog.dom.getElement('main'), goog.dom.createDom('div', {
        'id': 'field',
        'class': 'center',
        'style': 'position: relative; width: ' + (H+2) + 'px; height: ' + (H+2) + 'px; background-color: #c9daef; border: solid 7px #111; border-radius: 10px;'
    }, cellsDOM));

    /**
     * @private
     * @param {string} value
     * @returns {string} filename of required image (black or white)
     */
    function getImage(value) {
        return 'img/' + (value=='A' ? 'black' : value=='V' ? 'white' : 'blank') + '.png';
    }

    /**
     * @private
     * @param {goog.events.Event} e
     */
    function step(e) {
        var coords = e.currentTarget.id.split('-');
        websocket.send("step", {x: (coords[0]>>0), y: (coords[1]>>0)});
    }

    /**
     * Makes the elements clickable
     */
    this.enable = function() {
        goog.array.forEach(cellsDOM, function(cell) {
            goog.events.listen(cell, goog.events.EventType.CLICK, step);
        });
    };

    /**
     * Makes the elements unclickable
     */
    this.disable = function() {
        goog.array.forEach(cellsDOM, function(cell) {
            goog.events.unlisten(cell, goog.events.EventType.CLICK, step);
        });
    };

    /**
     * Inverts the stone (e.g. from black to white)
     * @param {Object} data
     */
    this.changeValue = function(data) {
        try {
            var item = goog.dom.getElement(data.x.toString() + '-' + data.y);
            item.setAttribute('src', getImage(data.data));
        } catch(e) {window.console.log(e.toString());}
    }
};
