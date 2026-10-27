// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useMemo } from "react";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { isUmtBackendConfigured, umtServiceUrls } from "@config/apiConfig";
import { useAccessToken } from "@hooks/useAccessToken";
import { foldIdentityError, useAsgardeoSub } from "@hooks/useAsgardeoSub";
import {
  mapUmtReleaseChunk,
  mapUmtReleaseChunkBuildStatus,
  mapUmtReleasedChunk,
  mapUmtReleaseChunksPage,
  type RawUmtReleaseChunk,
  type RawUmtReleaseChunkBuildStatus,
  type RawUmtReleaseChunksPage,
  type RawUmtReleasedChunk,
  type UmtDockerBuildStatus,
  type UmtPageRequest,
  type UmtReleaseChunk,
  type UmtReleaseChunkBuildStatus,
  type UmtReleaseChunksPage,
  type UmtReleaseChunkStatus,
  type UmtReleasedChunk,
} from "./umtReleaseChunks";

// Both lists load one page at a time, and keep the previous page on screen
// while the next one loads, so paging doesn't blank the grid between requests.
export function useUmtReleaseChunks({ page, pageSize }: UmtPageRequest) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;

  const query = useQuery<UmtReleaseChunksPage<UmtReleaseChunk>>({
    queryKey: ["umt-release-chunks", userSub, page, pageSize],
    enabled: isSignedIn && isUmtBackendConfigured() && Boolean(userSub),
    queryFn: async () => {
      const raw = await authedGet<RawUmtReleaseChunksPage<RawUmtReleaseChunk>>(
        umtServiceUrls.releaseChunksPage({ page, pageSize }),
        await getAccessToken(),
      );
      return mapUmtReleaseChunksPage(raw, mapUmtReleaseChunk);
    },
    placeholderData: keepPreviousData,
    retry: httpRetry,
  });

  return foldIdentityError(query, subState, retryIdentity);
}

export function useUmtReleasedChunks({ page, pageSize }: UmtPageRequest) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;

  const query = useQuery<UmtReleaseChunksPage<UmtReleasedChunk>>({
    queryKey: ["umt-released-chunks", userSub, page, pageSize],
    enabled: isSignedIn && isUmtBackendConfigured() && Boolean(userSub),
    queryFn: async () => {
      const raw = await authedGet<RawUmtReleaseChunksPage<RawUmtReleasedChunk>>(
        umtServiceUrls.releaseChunksPage({ states: "released", page, pageSize }),
        await getAccessToken(),
      );
      return mapUmtReleaseChunksPage(raw, mapUmtReleasedChunk);
    },
    placeholderData: keepPreviousData,
    retry: httpRetry,
  });

  return foldIdentityError(query, subState, retryIdentity);
}

export interface UmtReleaseChunkRowStatus {
  buildStatus?: UmtReleaseChunkBuildStatus;
  buildStatusLoading: boolean;
  chunkStatus?: UmtReleaseChunkStatus;
  chunkStatusLoading: boolean;
}

// A chunk's build statuses and its own lifecycle status live behind two
// further endpoints, one request each per row, so the pending list needs both
// for every chunk it shows. They are issued as two parallel query sets keyed
// by chunk id, which keeps them cached and deduplicated per row rather than
// refetching the lot whenever the list re-renders.
//
// A row whose requests fail is left to render its fallback chip rather than
// reporting the failure itself: a grid of per-row error banners would drown
// out the list, and every action that depends on a status checks for one
// before it runs.
export function useUmtReleaseChunkRowStatuses(ids: number[]): Record<number, UmtReleaseChunkRowStatus> {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const ready = isSignedIn && isUmtBackendConfigured() && Boolean(userSub);

  const buildStatusResults = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["umt-release-chunk-build-status", userSub, id],
      enabled: ready,
      queryFn: async () => {
        const raw = await authedGet<RawUmtReleaseChunkBuildStatus>(
          umtServiceUrls.releaseChunkBuildStatus(id),
          await getAccessToken(),
        );
        return mapUmtReleaseChunkBuildStatus(raw);
      },
      retry: httpRetry,
    })),
  });

  const chunkStatusResults = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["umt-release-chunk-status", userSub, id],
      enabled: ready,
      queryFn: async () =>
        authedGet<UmtReleaseChunkStatus>(umtServiceUrls.releaseChunk(id), await getAccessToken()),
      retry: httpRetry,
    })),
  });

  // A signature of what the queries have produced. `dataUpdatedAt` changes
  // exactly when a query's data changes, so this string stays equal across
  // renders that changed nothing, and the object below keeps its identity with
  // it. That matters because the grid rebuilds its entire column state, and
  // re-measures every row, whenever the columns built from this are a new
  // reference — which a freshly built object made them on every render.
  const signature = [
    ids.join(","),
    buildStatusResults.map((result) => `${result.dataUpdatedAt}:${result.isPending}`).join(","),
    chunkStatusResults.map((result) => `${result.dataUpdatedAt}:${result.isPending}`).join(","),
  ].join("|");

  return useMemo(() => {
    const statuses: Record<number, UmtReleaseChunkRowStatus> = {};
    ids.forEach((id, index) => {
      statuses[id] = {
        buildStatus: buildStatusResults[index]?.data,
        buildStatusLoading: buildStatusResults[index]?.isPending ?? false,
        chunkStatus: chunkStatusResults[index]?.data,
        chunkStatusLoading: chunkStatusResults[index]?.isPending ?? false,
      };
    });
    return statuses;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}

// Docker build statuses are only ever read inside the Build Information
// dialog, so this stays disabled until that dialog opens for a given chunk
// rather than fetching for every row on mount.

export function useUmtReleaseChunkDockerBuildStatus(id: number | null, enabled: boolean) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;

  const query = useQuery<UmtDockerBuildStatus[]>({
    queryKey: ["umt-release-chunk-docker-build-status", userSub, id],
    enabled: enabled && id !== null && isSignedIn && isUmtBackendConfigured() && Boolean(userSub),
    queryFn: async () =>
      authedGet<UmtDockerBuildStatus[]>(
        umtServiceUrls.releaseChunkDockerBuildStatus(id as number),
        await getAccessToken(),
      ),
    retry: httpRetry,
  });

  return foldIdentityError(query, subState, retryIdentity);
}
