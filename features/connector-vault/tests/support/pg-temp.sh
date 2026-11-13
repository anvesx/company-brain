#!/bin/sh
# Start a throwaway Postgres 16 on port 55438 in a temp data dir. Prints the DATABASE_URL and the data dir.
# Stop it with: pg_ctl -D <dir> stop; rm -rf <dir>
set -e
BIN=/opt/homebrew/opt/postgresql@16/bin
export LC_ALL=en_US.UTF-8
DIR=$(mktemp -d)
"$BIN/initdb" -D "$DIR" -U postgres --auth=trust >/dev/null
"$BIN/pg_ctl" -D "$DIR" -o "-p 55438 -k $DIR" -l "$DIR/log" -w start >/dev/null
echo "DATABASE_URL=postgres://postgres@127.0.0.1:55438/postgres"
echo "PGDATA=$DIR"
