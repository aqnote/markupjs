#!/bin/bash

ps_info=`ps aux | grep "node app/server.js" | grep -v grep`
pid=`echo  $ps_info | awk -F' ' '{print $2}'`
kill -9 $pid

exit 0
