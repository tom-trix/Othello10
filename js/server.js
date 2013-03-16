// imports
var webSocketServer = require('websocket').server;
var http = require('http');
var mongo = require('mongojs');




// global variables
var _users = [];




// load data from MongoDB
var db = mongo.connect('localhost:27017/Othello', ['users']);
db.users.find({}, function(err, data) {
    for (var i=0; i<data.length; i++) {
        var user = new User(null, data[i].name, 'OFFLINE');
        user.history = data[i].history;
        _users[user.name] = user;
    }
});




// create HTTP-Server
var port = 2666;
var _server = http.createServer();
_server.listen(port, function() {
    console.log((new Date()) + ' Server is listening on port ' + port);
});




// create Websocket-Server
new webSocketServer({httpServer: _server}).on('request', function(request) {

    // new client connected
    console.log((new Date()) + ' New client registered...');
    var connection = request.accept(null, request.origin);
    var user = null;

    // client sent a message
    connection.on('message', function(message) {
        if (message.type === 'utf8')
            try {
                console.log('>> Message received: ' + message.utf8Data);
                var json = JSON.parse(message.utf8Data);

                switch (json.type) {
                    case 'auth':
                        var userName = json.data;
                        user = _users[userName];
                        if (user == null) {
                            user = new User(connection, userName, 'ONLINE');
                            _users[userName] = user;
                        }
                        else {
                            user.connect = connection;
                            user.state = 'ONLINE';
                        }
                        user.send({type: 'ok'});
                        break;
                    case 'challenge':
                        var victimName = json.data;
                        var victim =_users[victimName];
                        if (user!=null && victim!=null && user.state == 'ONLINE' && victim.state == 'ONLINE') {
                            user.state = 'WAIT';
                            victim.state = 'WAIT';
                            victim.enemy = user;
                            user.send({type: 'ok'});
                            victim.send({type: 'challenge', data: user.name});
                        }
                        else user.send({type: 'error', data: 0});
                        break;
                    case 'accept':
                        if (user!=null && user.state == 'WAIT') {
                            var aggressor = user.enemy;
                            if (aggressor != null && aggressor.state == 'WAIT') {
                                aggressor.enemy = user;
                                user.state = 'PASSIVE';
                                aggressor.state = 'ACTIVE';
                                var field = new Field(aggressor, user);
                                user.field = field;
                                aggressor.field = field;
                                user.send({type: 'passive', data: field.getChangedCells()});
                                aggressor.send({type: 'active', data: field.getChangedCells()});
                            }
                            else user.send({type: 'error', data: 2});
                        }
                        else user.send({type: 'error', data: 1});
                        break;
                    case 'step':
                        if (user!=null && user.state == 'ACTIVE') {
                            var enemy = user.enemy;
                            var fld = user.field;
                            if (fld!=null && enemy!=null && enemy.state == 'PASSIVE') {
                                var stepResult = fld.doStep(user, json.data.x, json.data.y);
                                user.send({type: 'score', data: user.field.getScore(user)});
                                enemy.send({type: 'score', data: enemy.field.getScore(enemy)});
                                switch (stepResult) {
                                    case 'CONTINUE':
                                        user.state = 'PASSIVE';
                                        enemy.state = 'ACTIVE';
                                        user.send({type: 'passive', data: fld.getChangedCells()});
                                        enemy.send({type: 'active', data: fld.getChangedCells()});
                                        break;
                                    case 'FINISH':
                                        user.state = 'ONLINE';
                                        enemy.state = 'ONLINE';
                                        user.enemy = null;
                                        enemy.enemy = null;
                                        user.field = null;
                                        enemy.field = null;
                                        user.history.push(fld.getScore(user).percent);
                                        enemy.history.push(fld.getScore(enemy).percent);
                                        user.send({type: 'finish', data: fld.getChangedCells()});
                                        enemy.send({type: 'finish', data: fld.getChangedCells()});
                                        db.users.remove();
                                        for (var j in _users) {
                                            var us = _users[j];
                                            db.users.insert({name: us.name, history: us.history});
                                        }
                                        break;
                                    default:
                                        console.log('Error step result from field ' + stepResult);
                                        user.send({type: 'error', data: 5});
                                }
                            }
                            else user.send({type: 'error', data: 4});
                        }
                        else user.send({type: 'error', data: 3});
                        break;
                    case 'rating':
                        if (user!=null && user.state == 'ONLINE') {
                            var rating = [];
                            for (var i in _users) {
                                var usr = _users[i];
                                var history = usr.history;
                                var histSize = history.length;
                                rating.push({
                                    name: usr.name,
                                    games: histSize,
                                    wins: history.filter(function(a) {return a > 0.5}).length,
                                    loses: history.filter(function(a) {return a < 0.5}).length,
                                    deadheats: history.filter(function(a) {return a == 0.5}).length,
                                    percent: histSize > 0 ? history.reduce(function(a,b){return a+b;})/histSize : 0
                                });
                            }
                            rating.sort(function(a, b) {return a.percent < b.percent ? 1 : -1});
                            user.send({type: 'rating', data: rating});
                        }
                        else user.send({type: 'error', data: 6});
                        break;
                    default:
                        console.log('Unknown type: ' + json.type);
                }
            } catch (e) {
                console.log('Error while handling a message ' + message.utf8Data + '\n' + e.toString());
            }
        else console.log('Message is not UTF-8');
    });

    // client shut down
    connection.on('close', function(conn) {
        console.log((new Date()) + ' Client "' + (user!=null ? user.name : 'unknown') + '" shut down... ' + conn.toString());
        if (user!=null)
            user.state = 'OFFLINE';
    });
});

/**
 * User object
 * @param connect
 * @param name
 * @param state (ONLINE, WAIT, ACTIVE, PASSIVE, OFFLINE)
 * @constructor
 */
function User(connect, name, state) {
    this.connect = connect;
    this.name = name;
    this.state = state;
    this.history = [];
    this.enemy = null;
    this.field = null;

    /**
     * Send an object to client through the websocket
     * @param obj
     */
    this.send = function(obj) {
        this.connect.sendUTF(JSON.stringify(obj));
        console.log('>> Message send to "' + this.name + '": ' + JSON.stringify(obj));
    }
}

/**
 * Field object
 * @param aggressor
 * @param victim
 * @constructor
 */
function Field(aggressor, victim) {
    // field NxN
    const n = 5;

    // cells are the elements of a field (E = EMPTY, A = AGGRESSOR, V = VICTIM)
    for(var cells=[], i=0; i<n; i++) {
        cells[i] = [];
        for(var j=0; j<n; j++)
            cells[i][j] = 'E';
    }
    cells[(n/2>>0)-1][(n/2>>0)-1] = 'A';
    cells[(n/2>>0)]  [(n/2>>0)]   = 'A';
    cells[(n/2>>0)-1][(n/2>>0)]   = 'V';
    cells[(n/2>>0)]  [(n/2>>0)-1] = 'V';

    // changedCells is the optimisation: it keeps only those cells that were changed before
    for(var changedCells=[], k=0; k<n; k++)
        for(var m=0; m<n; m++)
            changedCells.push({x: k, y: m, data: cells[k][m]});

    /**
     * performs one gamestep
     * @param user
     * @param x
     * @param y
     * @returns {string}
     */
    this.doStep = function(user, x, y) {
        if (!ok(x, y) || cells[x][y] != 'E') return 'ERROR_0';
        changedCells.length = 0;
        switch (user) {
            case aggressor:
                acquire(x, y, 'A', 'V');
                break;
            case victim:
                acquire(x, y, 'V', 'A');
                break;
            default:
                return 'ERROR_1';
        }
        return isFinished() ? 'FINISH' : 'CONTINUE';
    };

    /**
     * returns those cells which were changed during the last gamestep
     * @returns {Array}
     */
    this.getChangedCells = function() {
        return changedCells;
    };

    /**
     * returns score in format {mine, his, percent}
     * @param user
     * @returns {*}
     */
    this.getScore = function(user) {
        for (var agressorScore=0, victimScore=0, i=0; i<n; i++)
            for (var j=0; j<n; j++)
                if (cells[i][j] == 'A') agressorScore++;
                else if (cells[i][j] == 'V') victimScore++;
        switch (user) {
            case aggressor:
                return {mine: agressorScore, his: victimScore, percent: agressorScore/(agressorScore+victimScore)};
            case victim:
                return {mine: victimScore, his: agressorScore, percent: victimScore/(agressorScore+victimScore)};
            default:
                return 'ERROR_2';
        }
    };

    /**
     * checks whether the game is over
     * @return {Boolean}
     */
    function isFinished() {
        for(var i=0; i<n; i++)
            for(var j=0; j<n; j++)
                if (cells[i][j] == 'E')
                    return false;
        return true;
    }

    /**
     * performs the calculation of the cell[x,y] following the rules of the game
     * @param x
     * @param y
     * @param mine
     * @param his
     */
    function acquire(x, y, mine, his) {
        cells[x][y] = mine;
        changedCells.push({x: x, y: y, data: mine});
        for (var i=-2; i<=2; i+=2)
            for (var j=-2; j<=2; j+=2)
                if (ok(x+i, y+j) && cells[x+i][y+j]==mine && cells[x+i-sign(i)][y+j-sign(j)]==his) {
                    cells[x+i-sign(i)][y+j-sign(j)] = mine;
                    changedCells.push({x: x+i-sign(i), y: y+j-sign(j), data: mine});
                }
    }

    /**
     * Checks whether the cell is inside the field
     * @param x
     * @param y
     * @return {Boolean}
     */
    function ok(x, y) {
        return (x>=0 && y>=0 && x<n && y<n);
    }

    /**
     * returns signum(x)
     * @param x
     * @return {Number}
     */
    function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }
}
