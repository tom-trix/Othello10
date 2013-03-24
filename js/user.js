goog.provide('ru.tomtrix.othello.User');

goog.require('goog.dom');

ru.tomtrix.othello.User = function(name, websocket) {
    this.name = name;

    var field = null;

    this.updateField = function(data) {
        if (field==null)
            field = new ru.tomtrix.othello.Field(data, websocket);
        else goog.array.forEach(data, function(item) {
            field.changeValue(item);
        });
    };

    this.setActive = function(active) {
        if (active) field.enable();
        else field.disable();
    };

    this.finish = function() {
        goog.dom.removeNode(goog.dom.getElement('field'));
        field = null;
        goog.array.forEach(goog.dom.getElementsByClass('battle'), function(item) {
            goog.style.showElement(item, false);
        });
    }
};
