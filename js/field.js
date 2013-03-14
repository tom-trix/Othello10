goog.provide('ru.tomtrix.othello');
goog.provide('ru.tomtrix.othello.Field');
 
goog.require('goog.dom');
goog.require('goog.style');
goog.require('goog.array');

ru.tomtrix.othello.Field = function(data) {
    var cellsDOM = [];
    goog.array.forEach(data, function(cell) {
        cellsDOM.push(goog.dom.createDom('div', {
            id: cell.x.toString() + cell.y,
            style: 'position: absolute; width: 20px; height: 20px; left: ' + (2+cell.x*22) + 'px; top: ' + (2+cell.y*22) + 'px; background-color: #4f8;'
        }, cell.data));
    });

    var fieldDOM = goog.dom.createDom('div', {
        id: 'field',
        style: 'position: relative; width: 222px; height: 222px; left: 100px; background-color: #5678e3;'
    }, cellsDOM);
    goog.dom.appendChild(goog.dom.getElement('main'), fieldDOM);
};
