#!/bin/bash

export PORT=80
export DEBUG=markup
node app/server.js >run.log 2>&1 & 

exit 0
