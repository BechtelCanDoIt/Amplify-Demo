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
export BAL_CONFIG_VAR_JOBSURL="${BAL_CONFIG_VAR_JOBSURL:-http://127.0.0.1:9091}"
export BAL_CONFIG_VAR_SCHEDULERURL="${BAL_CONFIG_VAR_SCHEDULERURL:-http://127.0.0.1:8080}"
export BAL_CONFIG_VAR_SCHEDULERJOBSURL="${BAL_CONFIG_VAR_SCHEDULERJOBSURL:-http://127.0.0.1:9091}"

# Migrations and seeds are idempotent. Turn this off once the schema is in place so the admin DB
# credentials (MIGRATE_*) can be removed from the running component.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[demo] database migrate + seed"
  with_prefix MIGRATE $JAVA -jar migrate.jar
else
  echo "[demo] RUN_MIGRATIONS=false, skipping migrate + seed"
fi

PIDS=""
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
