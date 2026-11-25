#!/bin/sh
# Start the local test server if it isn't running.
curl -s -o /dev/null --noproxy '*' http://localhost:8765/ || { (setsid python3 -m http.server 8765 -d /home/claude/galaxie/pub >/tmp/srv.log 2>&1 &); sleep 1.2; }
