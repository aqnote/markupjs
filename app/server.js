#!/usr/bin/env node

'use strict';

// Modules
var debug = require('debug')('markup');
console.log(debug);

// Here is where we load Raneto.
// When you are in your own project repository,
// Raneto would be installed via NPM and loaded as:
// var raneto = require('raneto');
var markup = require('./markup.js');

// Then, we load our configuration file
// This can be done inline, with a JSON file,
// or with a Node.js module as we do below.
var config = require('./config.js');

// Finally, we initialize Raneto
// with our configuration object
var app = markup(config);

// Load the HTTP Server
var server = app.listen(app.get('port'), function () {
  debug('Express HTTP server listening on port ' + server.address().port);
});
