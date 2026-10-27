#!/bin/sh
# Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
#
# WSO2 LLC. licenses this file to you under the Apache License,
# Version 2.0 (the "License"); you may not use this file except
# in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

# Amplify demo entrypoint. See demo-docker/Dockerfile for the layout and the env-prefix convention.
set -eu
cd /app

# with_prefix PREFIX cmd...: run cmd with PREFIX_BAL_CONFIG_VAR_X exported as BAL_CONFIG_VAR_X.
with_prefix() {
  p=$1; shift
  (
    for v in $(env | sed -n "s/^${p}_\(BAL_CONFIG_VAR_[A-Za-z0-9_]*\)=.*/\1/p"); do
      eval "export $v=\"\${${p}_$v}\""
    done
    exec "$@"
  )
}

# Three JVMs share the container: cap each heap at a quarter of the memory limit.
JAVA="java -XX:MaxRAMPercentage=25 -XX:+ExitOnOutOfMemoryError"

# Same-container wiring. The API calls jobs and the scheduler over loopback; the scheduler calls jobs back.
# Exported here (not in Choreo config) so no connections are needed; an explicit Choreo value still wins.
# Prefixed API_ on purpose: Ballerina fails on BAL_CONFIG_VAR_* names a program does not declare.
export API_BAL_CONFIG_VAR_JOBSURL="${API_BAL_CONFIG_VAR_JOBSURL:-http://127.0.0.1:9091}"
export API_BAL_CONFIG_VAR_SCHEDULERURL="${API_BAL_CONFIG_VAR_SCHEDULERURL:-http://127.0.0.1:8080}"
export API_BAL_CONFIG_VAR_SCHEDULERJOBSURL="${API_BAL_CONFIG_VAR_SCHEDULERJOBSURL:-http://127.0.0.1:9091}"

# ---- Embedded Postgres (ephemeral: a new cluster on every start) ----------------------------------------
PGDATA=/pgdata
rand() { head -c 24 /dev/urandom | base64 | tr -d '/+=\n'; }
PG_ADMIN_PW=$(rand); API_DB_PW=$(rand); JOBS_DB_PW=$(rand); SCHED_DB_PW=$(rand)

echo "[demo] initialising embedded postgres"
rm -rf "${PGDATA:?}"/* 2>/dev/null || true
printf '%s' "$PG_ADMIN_PW" > /tmp/pgpw
initdb -D "$PGDATA" -U postgres --pwfile=/tmp/pgpw --auth=scram-sha-256 \
  --encoding=UTF8 --locale=C.UTF-8 >/dev/null
rm -f /tmp/pgpw
postgres -D "$PGDATA" -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp \
  -c max_connections=100 -c shared_buffers=128MB &
PG_PID=$!
for i in $(seq 1 60); do pg_isready -q -h 127.0.0.1 -p 5432 && break; sleep 1; done
pg_isready -q -h 127.0.0.1 -p 5432 || { echo "[demo] postgres did not start"; exit 1; }
PGPASSWORD=$PG_ADMIN_PW psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q <<SQL
CREATE DATABASE amplify;
CREATE ROLE scheduler LOGIN PASSWORD '$SCHED_DB_PW';
CREATE DATABASE scheduler OWNER scheduler;
SQL

# Every app talks to it over loopback, no TLS. Roles amplify_api / amplify_jobs are created by the migration.
export BAL_CONFIG_VAR_DBHOST=127.0.0.1 BAL_CONFIG_VAR_DBPORT=5432 BAL_CONFIG_VAR_DBNAME=amplify
export BAL_CONFIG_VAR_DBSSLMODE=DISABLE
export MIGRATE_BAL_CONFIG_VAR_DBUSER=postgres MIGRATE_BAL_CONFIG_VAR_DBPASSWORD=$PG_ADMIN_PW
export MIGRATE_BAL_CONFIG_VAR_APIDBPASSWORD=$API_DB_PW MIGRATE_BAL_CONFIG_VAR_JOBSDBPASSWORD=$JOBS_DB_PW
export API_BAL_CONFIG_VAR_DBPASSWORD=$API_DB_PW JOBS_BAL_CONFIG_VAR_DBPASSWORD=$JOBS_DB_PW
export DSN="postgres://scheduler:${SCHED_DB_PW}@127.0.0.1:5432/scheduler?sslmode=disable"

echo "[demo] database migrate + seed"
with_prefix MIGRATE $JAVA -jar migrate.jar

PIDS="$PG_PID"
start() { # name prefix cmd...
  n=$1; p=$2; shift 2
  echo "[demo] starting $n"
  with_prefix "$p" "$@" &
  PIDS="$PIDS $!"
}

# Scheduler (no auth: bound to the container only, Choreo exposes nothing but 9090).
start scheduler SCHED /app/scheduler
if [ -n "${DSN:-}" ]; then
  ( for i in $(seq 1 60); do
      PGCONNECT_TIMEOUT=5 psql "$DSN" -tAc "SELECT to_regclass('job_history')" 2>/dev/null | grep -q job_history \
        && exec psql "$DSN" -v ON_ERROR_STOP=1 -q -f /app/history-retention.sql
      sleep 2
    done; echo "[demo] job_history never appeared" ) &
fi

start amplify-jobs JOBS $JAVA -jar jobs.jar


start amplify-api API $JAVA -jar api.jar

# Any process dying takes the container down so Choreo restarts it as a whole.
trap 'kill $PIDS 2>/dev/null; exit 0' INT TERM
while :; do
  for pid in $PIDS; do
    kill -0 "$pid" 2>/dev/null || { echo "[demo] process $pid exited, stopping"; kill $PIDS 2>/dev/null; exit 1; }
  done
  sleep 5
done
