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
# Docker context: marketing-tools (repo root), so Choreo's build context needs
#   Dockerfile path: demo-docker/Dockerfile      Docker context: .
#   docker build -f demo-docker/Dockerfile -t amplify-demo .
# Inside the container (entrypoint.sh starts them in this order):
#   1. amplify-database  one-shot, migrations then seeds, must exit 0 or the container stops (skip: RUN_MIGRATIONS=false)
#   2. scheduler         127.0.0.1:8080   (akorn/scheduler, needs DSN)
#   3. amplify-jobs      127.0.0.1:9091
#   4. amplify-api       0.0.0.0:9090     the ONLY endpoint Choreo exposes
# Per-process config: the apps share env names (DBUSER, DBPASSWORD, ...) so each var is prefixed with its
# process, e.g. API_BAL_CONFIG_VAR_DBPASSWORD, JOBS_BAL_CONFIG_VAR_DBPASSWORD, MIGRATE_BAL_CONFIG_VAR_DBUSER.
# Unprefixed BAL_CONFIG_VAR_* apply to all processes (DBHOST, DBNAME, DBSSLMODE ...).
# LinkedIn is the real one (api.linkedin.com / www.linkedin.com); there is no mock in this image.
# The API reaches jobs and the scheduler on 127.0.0.1, so no Choreo connections are needed between them.
# Demo only: three JVMs + one Go process in one container, no per-process restart. Give it >= 2 GB memory.

FROM ballerina/ballerina:2201.13.3@sha256:7cba1a3bcb3314e2444aa6823d332e79882437df512de71037c4b0607d39e019 AS build
WORKDIR /home/ballerina
ARG A=apps/amplify
# Shared packages go into this stage's own local repository (ADR-020/021).
COPY --chown=ballerina ${A}/amplify-common amplify-common
RUN cd amplify-common && bal pack && bal push --repository=local
COPY --chown=ballerina ${A}/amplify-domain amplify-domain
RUN cd amplify-domain && bal pack && bal push --repository=local
COPY --chown=ballerina ${A}/amplify-api amplify-api
RUN cd amplify-api && bal build
COPY --chown=ballerina ${A}/amplify-jobs amplify-jobs
RUN cd amplify-jobs && bal build
COPY --chown=ballerina ${A}/amplify-database amplify-database
RUN cd amplify-database && bal build

FROM akorn/scheduler:1.7.8@sha256:07462c0684245d5f8aaed8018e4594da3ba113d5b38bb6dffcc32403108d2cf6 AS scheduler

FROM eclipse-temurin:21-jre-alpine@sha256:51ab5e3302e7141ce665ca3ea85e8b5cd648eafbc3c0c90dd79d6537684e4555
# psql is only for the scheduler job_history retention trigger.
RUN apk add --no-cache postgresql-client \
 && addgroup -g 10014 choreo && adduser -D -H -u 10014 -G choreo choreouser
WORKDIR /app
COPY --from=scheduler /scheduler /app/scheduler
COPY --from=build /home/ballerina/amplify-api/target/bin/amplify_api.jar api.jar
COPY --from=build /home/ballerina/amplify-jobs/target/bin/amplify_jobs.jar jobs.jar
COPY --from=build /home/ballerina/amplify-database/target/bin/amplify_database.jar migrate.jar
COPY --from=build --chown=10014:10014 /home/ballerina/amplify-database/migrations migrations
COPY --from=build --chown=10014:10014 /home/ballerina/amplify-database/seed seed
COPY --chown=10014:10014 apps/amplify/amplify-scheduler/history-retention.sql history-retention.sql
COPY --chmod=0555 demo-docker/entrypoint.sh entrypoint.sh
# Choreo requires a numeric non-root UID (10000-20000).
USER 10014
EXPOSE 9090
ENTRYPOINT ["/app/entrypoint.sh"]
