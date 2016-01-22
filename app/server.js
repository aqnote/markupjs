#!/usr/bin/env node

'use strict';

var debug = require('debug')('markup');
console.log(debug);

var config = require('./config.js');
var markup = require('./markup.js');

var app = markup(config);

var server = app.listen(app.get('port'), function () {
  debug('Express HTTP server listening on port ' + server.address().port);
});
