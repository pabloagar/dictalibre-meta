#!/bin/sh
# Fake interpreter: ignores args; behaviour by env FAKE_MODE
case "$FAKE_MODE" in
 crash) read line; exit 3;;
 hang) read line; sleep 30;;
 empty) while read line; do id=$(echo "$line" | sed 's/.*"id":"\([^"]*\)".*/\1/'); echo "{\"id\":\"$id\",\"result\":{\"text\":\"\",\"loadMs\":0,\"generateMs\":1,\"cold\":false}}"; done;;
esac
