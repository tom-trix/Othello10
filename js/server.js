// imports
var webSocketServer = require('websocket').server;
var http = require('http');
var mongo = require('mongojs');




// global variables
// USER = name: String => {connect: Connection; state: [ONLINE, ACTIVE, PASSIVE, OFFLINE]; history: Array[Int]}
var _users = new Number();




// load data from MongoDB
var db = mongo.connect('46.146.231.100/Auction', ['goods']);
db.goods.find({}, function(err, page) {
    _rating = page;
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
    var user;

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
                            user = new User(connection, userName, 'ONLINE', []);
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
                        if (user!=null && victim!=null && victim.state == 'ONLINE') {
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
                            if (aggressor != null && aggressor.state == 'WAIT' && aggressor.enemy == user) {
                                user.enemy = aggressor;
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
                            _users.sort(function(a, b) {
                                for (var ratinga=0, i=0; i<a.history.length; i++) ratinga+=a.history[i];
                                for (var ratingb=0, j=0; j<b.history.length; j++) ratingb+=a.history[j];
                                return ratinga > ratingb ? 1 : ratinga < ratingb ? -1 : 0;
                            });
                            // TODO формирование рейтинга
                        }
                        else user.send({type: 'error', data: 6});
                        break;
                    case 'score':
                        if (user!=null && user.field!=null && (user.state == 'ACTIVE' || user.state == 'PASSIVE'))
                            user.send({type: 'score', data: user.field.getScore(user)});
                        else user.send({type: 'error', data: 7});
                        break;
                    default:
                        console.log('Unknown type: ' + json.type);
                }
            } catch (e) {
                console.log('Error while handling a message ' + message.utf8Data);
            }
        else console.log('Message is not UTF-8');
    });

    // client shut down
    connection.on('close', function(conn) {
        console.log((new Date()) + ' Client ' + conn.remoteAddress + ' shut down...');
        user.state = 'OFFLINE';
    });
});


function User(connect, name, state, history) {
    this.connect = connect;
    this.name = name;
    this.state = state;
    this.history = history;
    this.enemy = null;
    this.field = null;

    this.send = function(obj) {
        connect.sendUTF(JSON.stringify(obj));
    }
}

function Field(aggressor, victim) {
    // cells are the elements of a field (E = EMPTY, A = AGGRESSOR, V = VICTIM)
    for(var cells=[], i=0; i<10; i++)
        for(var j=0; j<10; j++)
            cells[i][j] = 'E';
    cells[4][4] = 'A';
    cells[5][5] = 'A';
    cells[4][5] = 'V';
    cells[5][4] = 'V';
    // changedCells is the optimisation: it keeps only those cells that were changed before
    for(var changedCells=[], k=0; k<10; k++)
        for(var m=0; m<10; m++)
            changedCells.push({x: k, y: m, data: cells[k][m]});

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

    this.getChangedCells = function() {
        return changedCells;
    };

    this.getScore = function(user) {
        for (var agressorScore=0, victimScore=0, i=0; i<10; i++)
            for (var j=0; j<10; j++)
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
        for(var i=0; i<10; i++)
            for(var j=0; j<10; j++)
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
        return (x>=0 && y>=0 && x<10 && y<10);
    }

    /**
     * returns signum(x)
     * @param x
     * @return {Number}
     */
    function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }
}
