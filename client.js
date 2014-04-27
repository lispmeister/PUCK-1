
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var getopt = require('posix-getopt');
var restify = require('restify');



///--- Globals

var sprintf = util.format;



///--- API

function PuckClient(options) {
        assert.object(options, 'options');
        assert.object(options.log, 'options.log');
        assert.optionalString(options.socketPath, 'options.socketPath');
        assert.optionalString(options.url, 'options.url');
        assert.optionalString(options.version, 'options.version');

        var self = this;
        var ver = options.version || '~1.0';

        this.client = restify.createClient({
                log: options.log,
                name: 'PuckClient',
                socketPath: options.socketPath,
                type: 'json',
                url: options.url,
                version: ver
        });
        this.log = options.log.child({component: 'PuckClient'}, true);
        this.url = options.url;
        this.version = ver;

        if (options.username && options.password) {
                this.username = options.username;
                this.client.basicAuth(options.username, options.password);
        }
}


PuckClient.prototype.create = function create(value, cb) {
        assert.string(value, 'value');
        assert.func(cb, 'callback');

        this.client.post('/puck', {value: value}, function (err, req, res, obj) {
                if (err) {
                        cb(err);
                } else {
                        cb(null, obj);
                }
        });
};


PuckClient.prototype.list = function list(cb) {
        assert.func(cb, 'callback');

        this.client.get('/puck', function (err, req, res, obj) {
                if (err) {
                        cb(err);
                } else {
                        cb(null, obj);
                }
        });
};


PuckClient.prototype.get = function get(key, cb) {
        assert.string(key, 'key');
        assert.func(cb, 'callback');

        this.client.get('/puck/' + key, function (err, req, res, obj) {
                if (err) {
                        cb(err);
                } else {
                        cb(null, obj);
                }
        });
};


PuckClient.prototype.update = function update(puck, cb) {
        assert.object(puck, 'puck');
        assert.func(cb, 'callback');

        this.client.put('/puck/' + puck.key, puck, function (err) {
                if (err) {
                        cb(err);
                } else {
                        cb(null);
                }
        });
};


PuckClient.prototype.del = function del(key, cb) {
        if (typeof (key) === 'function') {
                cb = key;
                key = '';
        }
        assert.string(key, 'key');
        assert.func(cb, 'callback');

        var p = '/puck' + (key.length > 0 ? '/' + key : '');
        this.client.del(p, function (err) {
                if (err) {
                        cb(err);
                } else {
                        cb(null);
                }
        });
};


PuckClient.prototype.toString = function toString() {
        var str = sprintf('[object PuckClient<url=%s, username=%s, version=%s]',
                          this.url, this.username || 'null', this.version);
        return (str);
};



///--- API

module.exports = {
        createClient: function createClient(options) {
                return (new PuckClient(options));
        }
};
