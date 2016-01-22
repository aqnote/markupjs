#!/bin/bash

export PORT=9000
export DEBUG=markup
node app/server.js >>logs/run.log 2>&1 & 

exit 0
