// imports
//noinspection JSUnresolvedFunction
var webSocketServer = require('websocket').server;
//noinspection JSUnresolvedFunction
var http = require('http');
//noinspection JSUnresolvedFunction
var mongo = require('mongojs');




// global variables
var _users = new Users();
var _mongo = new Mongo('localhost', 27017, 'Othello', ['users'], _users);




// create HTTP-Server
const port = 2666;
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
                        if (userName.trim() == "" || userName.length > 20 || userName.indexOf('<') >= 0)
                            connection.sendUTF(JSON.stringify({type: 'error', data: 'Wrong name'}));
                        else {
                            user = _users.get(userName);
                            if (user == null) {
                                user = new User(connection, userName, StateEnum.ONLINE);
                                _users.add(user);
                            }
                            else {
                                user.connect = connection;
                                user.state = StateEnum.ONLINE;
                            }
                            user.send('ok');
                            _users.sendRatingToAll();
                        }
                        break;
                    case 'challenge':
                        var victimName = json.data;
                        var victim =_users.get(victimName);
                        if (user!=null && victim!=null && user.state==StateEnum.ONLINE && victim.state==StateEnum.ONLINE && user!=victim) {
                            user.state = StateEnum.WAIT;
                            victim.state = StateEnum.WAIT;
                            victim.enemy = user;
                            user.send('ok');
                            victim.send('challenge', user.name);
                            _users.sendRatingToAll();
                        }
                        else user.send('error', 'error in challenge');
                        break;
                    case 'accept':
                        if (user!=null && user.state == StateEnum.WAIT) {
                            var aggressor = user.enemy;
                            if (aggressor != null && aggressor.state == StateEnum.WAIT) {
                                aggressor.enemy = user;
                                user.state = StateEnum.PASSIVE;
                                aggressor.state = StateEnum.ACTIVE;
                                var field = new Field(aggressor, user);
                                user.field = field;
                                aggressor.field = field;
                                user.send('passive', field.getChangedCells());
                                aggressor.send('active', field.getChangedCells());
                            }
                            else user.send('error', 'error in accept (2)');
                        }
                        else user.send('error', 'error in accept (1)');
                        break;
                    case 'escape':
                        if (user!=null && user.state == StateEnum.WAIT) {
                            var agressor = user.enemy;
                            if (agressor != null && agressor.state == StateEnum.WAIT) {
                                user.enemy = null;
                                user.state = StateEnum.ONLINE;
                                agressor.state = StateEnum.ONLINE;
                                _users.sendRatingToAll();
                            }
                            else user.send('error', 'error in escape (2)');
                        }
                        else user.send('error', 'error in escape (1)');
                        break;
                    case 'step':
                        if (user!=null && user.state == StateEnum.ACTIVE) {
                            var enemy = user.enemy;
                            var fld = user.field;
                            if (fld!=null && enemy!=null && enemy.state == StateEnum.PASSIVE) {
                                var stepResult = fld.doStep(user, json.data.x, json.data.y);
                                user.send('score', user.field.getScore(user));
                                enemy.send('score', enemy.field.getScore(enemy));
                                switch (stepResult) {
                                    case 'CONTINUE':
                                        user.state = StateEnum.PASSIVE;
                                        enemy.state = StateEnum.ACTIVE;
                                        user.send('passive', fld.getChangedCells());
                                        enemy.send('active', fld.getChangedCells());
                                        break;
                                    case 'FINISH':
                                        user.state = StateEnum.ONLINE;
                                        enemy.state = StateEnum.ONLINE;
                                        user.enemy = null;
                                        enemy.enemy = null;
                                        user.field = null;
                                        enemy.field = null;
                                        user.history.push(fld.getScore(user).percent);
                                        enemy.history.push(fld.getScore(enemy).percent);
                                        user.send('finish', fld.getChangedCells());
                                        enemy.send('finish', fld.getChangedCells());
                                        _mongo.saveAll();
                                        break;
                                    default:
                                        console.log('Error step result from field ' + stepResult);
                                        user.send('error', 'unknown constant ' + stepResult);
                                }
                            }
                            else user.send('error', 'error in step (1)');
                        }
                        else user.send('error', 'error in step (1)');
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
            user.state = StateEnum.OFFLINE;
        _users.sendRatingToAll();
    });
});

function Users() {
    var all = [];

    this.get = function(name) {
        return all[name];
    };

    this.add = function(user) {
        all[user.name] = user;
    };

    this.getArray = function() {
        var result = [];
        for (var i in all) {
            //noinspection JSUnfilteredForInLoop
            result.push(all[i]);
        }
        return result;
    };

    this.sendRatingToAll = function() {
        var rating = [];
        for (var i=0; i<_users.getArray().length; i++) {
            var usr = _users.getArray()[i];
            var history = usr.history;
            var histSize = history.length;
            rating.push({
                name: usr.name,
                state: usr.state,
                games: histSize,
                wins: history.filter(function(a) {return a > 0.5}).length,
                loses: history.filter(function(a) {return a < 0.5}).length,
                deadheats: history.filter(function(a) {return a == 0.5}).length,
                percent: (histSize > 0 ? history.reduce(function(a,b){return a+b;})/histSize : 0).toFixed(2)
            });
        }
        rating.sort(function(a, b) {return a.percent < b.percent ? 1 : -1});
        for (var j=0; j<_users.getArray().length; j++) {
            var user = _users.getArray()[j];
            if (user.state == StateEnum.ONLINE || user.state == StateEnum.WAIT)
                user.send('rating', rating);
        }
    }
}

/**
 * MongoDB worker
 * @param {String} host
 * @param {String|number} port
 * @param {String} database
 * @param {Array} collection
 * @param {Users} users
 * @constructor
 */
function Mongo(host, port, database, collection, users) {
    var db = mongo.connect(host + ':' + port + '/' + database, collection);
    //noinspection JSUnresolvedVariable
    var coll = db.users;
    coll.find({}, function(err, data) {
        for (var i=0; i<data.length; i++) {
            var user = new User(null, data[i].name, StateEnum.OFFLINE);
            user.history = data[i].history;
            users.add(user);
            console.log(user.name + ' loaded...');
        }
    });

    this.saveAll = function() {
        coll.remove();
        for (var i=0; i<users.getArray().length; i++) {
            var us = users.getArray()[i];
            if (us.history.length > 0)
                coll.insert({name: us.name, history: us.history});
        }
    }
}

/**
 * User object
 * @param {Connection} connect
 * @param {String} name
 * @param {number} state
 * @constructor
 */
function User(connect, name, state) {
    /**
     * Websocket connection
     * @type {Connection}
     */
    this.connect = connect;
    /**
     * Username
     * @type {String}
     */
    this.name = name;
    /**
     * User state
     * @type {number}
     */
    this.state = state;
    /**
     * History of battle results (in %)
     * @type {Array}
     */
    this.history = [];
    /**
     * Current enemy in the battle
     * @type {User}
     */
    this.enemy = null;
    /**
     * Reference to a field where a battle happens
     * @type {Field}
     */
    this.field = null;

    /**
     * Send an object to client through the websocket
     * @param type type of the message {String}
     * @param data data to send
     */
    this.send = function(type, data) {
        this.connect.sendUTF(JSON.stringify({type: type, data: data}));
        console.log('>> Message send to "' + this.name + '": ' + JSON.stringify({type: type, data: data}));
    }
}

/**
 * Field object
 * @param {User} aggressor
 * @param {User} victim
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
     * @param {User} user
     * @param {number} x
     * @param {number} y
     * @returns {string} FINISH or CONTINUE
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
     * @param {number} x x-coordinate
     * @param {number} y y-coordinate
     * @param {String} mine A or V
     * @param {String} his A or V
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
     * @param {number} x x-coordinate
     * @param {number} y y-coordinate
     * @return {Boolean}
     */
    function ok(x, y) {
        return (x>=0 && y>=0 && x<n && y<n);
    }

    /**
     * returns signum(x)
     * @param {number} x
     * @return {number}
     */
    function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }
}

/**
 * User states
 * @type {{ONLINE: number, OFFLINE: number, ACTIVE: number, PASSIVE: number, WAIT: number}}
 */
StateEnum = {
    OFFLINE: 0,
    ONLINE: 1,
    WAIT: 2,
    ACTIVE: 3,
    PASSIVE: 4
};
