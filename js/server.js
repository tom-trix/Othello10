// imports
var webSocketServer = require('websocket').server;
var http = require('http');
var mongo = require('mongojs')
var utils = require('./utils');




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
                                user.send({type: 'passive', data: field.getField()});
                                aggressor.send({type: 'active', data: field.getField()});
                            }
                            else user.send({type: 'error', data: 2});
                        }
                        else user.send({type: 'error', data: 1});
                        break;
                    case 'step':
                        if (user!=null && user.state == 'ACTIVE') {
                            var enemy = user.enemy;
                            var field = user.field;
                            if (field!=null && enemy!=null && enemy.state == 'PASSIVE') {
                                var stepResult = field.doStep(user, json.data.x, json.data.y);
                                switch (stepResult) {
                                    case 'CONTINUE':
                                        user.state = 'PASSIVE';
                                        enemy.state = 'ACTIVE';
                                        user.send({type: 'passive', data: field.getField()});
                                        enemy.send({type: 'active', data: field.getField()});
                                        break;
                                    case 'FINISH':
                                        user.state = 'ONLINE';
                                        enemy.state = 'ONLINE';
                                        user.send({type: 'finish', data: field.getField()});
                                        enemy.send({type: 'finish', data: field.getField()});
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
                        if (user!=null && user.state == 'ONLINE')
                            user.send({type: 'rating', data: 'not_implemented'}); //TODO
                        else user.send({type: 'error', data: 6});
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
    this.enemy = null;
    this.field = null;

    this.send = function(obj) {
        connect.sendUTF(JSON.stringify(obj));
    }
}

function Field(aggressor, victim) {
    this.doStep = function(user, x, y) {
        return 'CONTINUE';  //TODO
    };

    this.getField = function() {
        return 5;           //TODO
    };
}
