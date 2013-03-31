goog.provide('ru.tomtrix.othello.User');

goog.require('goog.dom');

/**
 * User
 * @param {string} name username
 * @param {ru.tomtrix.othello.Websocket} websocket reference to a websocket
 * @constructor
 */
ru.tomtrix.othello.User = function(name, websocket) {
    /** username
     * @type {string} */
    this.name = name;

    /**field
     * @type {ru.tomtrix.othello.Field} */
    var field = null;

    /** updates the field following the data that contains users' actions
     * @param {Array} data */
    this.updateField = function(data) {
        if (field==null)
            field = new ru.tomtrix.othello.Field(data, websocket);
        else goog.array.forEach(data, function(item) {
            field.changeValue(item);
        });
    };

    /** set the field either enabled or disabled
     * @param active */
    this.setActive = function(active) {
        if (active) field.enable();
        else field.disable();
    };

    /** Finishes the current game by removing the field and hiding some game elements */
    this.finish = function() {
        goog.dom.removeNode(goog.dom.getElement('field'));
        field = null;
        goog.array.forEach(goog.dom.getElementsByClass('battle'), function(item) {
            goog.style.showElement(item, false);
        });
    }
};
