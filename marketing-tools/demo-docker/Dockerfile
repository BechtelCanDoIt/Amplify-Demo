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

# Amplify demo: every Amplify component in ONE image, for a single Choreo component.
# Docker context: the repository root (Amplify-Demo), so Choreo needs
#   Dockerfile path: marketing-tools/demo-docker/Dockerfile   Docker context: .
#   docker build -f marketing-tools/demo-docker/Dockerfile -t amplify-demo .
# Inside the container (entrypoint.sh starts them in this order):
#   0. postgres 18       127.0.0.1:5432, embedded, databases amplify + scheduler, EPHEMERAL (see below)
#   1. amplify-database  one-shot, migrations then seeds, must exit 0 or the container stops
#   2. scheduler         127.0.0.1:8080   (akorn/scheduler, needs DSN)
#   3. amplify-jobs      127.0.0.1:9091
#   4. amplify-api       0.0.0.0:9090     the ONLY endpoint Choreo exposes
# Embedded database (demo only): a fresh Postgres cluster is created on every container start, so data does
# NOT survive a restart or redeploy (the seed data is reloaded). All DB passwords are generated at start;
# there is no DB config to set in Choreo. Replace with a managed Postgres before any real use.
# Per-process config: the apps share env names (DBUSER, DBPASSWORD, ...) so each var is prefixed with its
# process, e.g. API_BAL_CONFIG_VAR_DBPASSWORD, JOBS_BAL_CONFIG_VAR_DBPASSWORD, MIGRATE_BAL_CONFIG_VAR_DBUSER.
# Unprefixed BAL_CONFIG_VAR_* apply to all processes (DBHOST, DBNAME, DBSSLMODE ...).
# LinkedIn is the real one (api.linkedin.com / www.linkedin.com); there is no mock in this image.
# The API reaches jobs and the scheduler on 127.0.0.1, so no Choreo connections are needed between them.
# Demo only: three JVMs + one Go process in one container, no per-process restart. Give it >= 2 GB memory.

FROM ballerina/ballerina:2201.13.3@sha256:7cba1a3bcb3314e2444aa6823d332e79882437df512de71037c4b0607d39e019 AS build
# The base image declares VOLUME /home/ballerina. Podman/Buildah (Choreo) discards whatever a RUN writes
# under a volume path when that step ends, and that is where `bal push --repository=local` puts the shared
# packages (~/.ballerina). So: sources and outputs live outside the volume (/build, /out), and every bal
# command runs in ONE RUN, so the local repository only has to live for that single step.
USER root
RUN mkdir /build /out && chown ballerina /build /out
USER ballerina
WORKDIR /build
ARG A=marketing-tools/apps/amplify
COPY --chown=ballerina ${A}/amplify-common amplify-common
COPY --chown=ballerina ${A}/amplify-domain amplify-domain
COPY --chown=ballerina ${A}/amplify-api amplify-api
COPY --chown=ballerina ${A}/amplify-jobs amplify-jobs
COPY --chown=ballerina ${A}/amplify-database amplify-database
# Shared packages go into this step's own local repository (ADR-020/021), then each service is built.
RUN set -e \
 && (cd amplify-common && bal pack && bal push --repository=local) \
 && (cd amplify-domain && bal pack && bal push --repository=local) \
 && (cd amplify-api && bal build) \
 && (cd amplify-jobs && bal build) \
 && (cd amplify-database && bal build) \
 && cp amplify-api/target/bin/amplify_api.jar /out/api.jar \
 && cp amplify-jobs/target/bin/amplify_jobs.jar /out/jobs.jar \
 && cp amplify-database/target/bin/amplify_database.jar /out/migrate.jar

FROM akorn/scheduler:1.7.8@sha256:07462c0684245d5f8aaed8018e4594da3ba113d5b38bb6dffcc32403108d2cf6 AS scheduler

FROM eclipse-temurin:21-jre-alpine@sha256:51ab5e3302e7141ce665ca3ea85e8b5cd648eafbc3c0c90dd79d6537684e4555
# Embedded Postgres 18 (native uuidv7(); contrib = citext, pg_trgm). psql also runs the scheduler retention SQL.
RUN apk upgrade --no-cache \
 && apk add --no-cache postgresql18 postgresql18-contrib postgresql18-client \
 && addgroup -g 10014 choreo && adduser -D -H -u 10014 -G choreo choreouser
RUN mkdir /pgdata && chown 10014:10014 /pgdata && chmod 700 /pgdata
WORKDIR /app
COPY --from=scheduler /scheduler /app/scheduler
COPY --from=build /out/api.jar /out/jobs.jar /out/migrate.jar /app/
COPY --from=build --chown=10014:10014 /build/amplify-database/migrations migrations
COPY --from=build --chown=10014:10014 /build/amplify-database/seed seed
COPY --chown=10014:10014 marketing-tools/apps/amplify/amplify-scheduler/history-retention.sql history-retention.sql
COPY --chmod=0555 marketing-tools/demo-docker/entrypoint.sh entrypoint.sh
# Choreo requires a numeric non-root UID (10000-20000).
USER 10014
EXPOSE 9090
ENTRYPOINT ["/app/entrypoint.sh"]
