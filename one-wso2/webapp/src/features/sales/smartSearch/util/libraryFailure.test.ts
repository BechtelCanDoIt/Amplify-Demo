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
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@api/http";
import { RequestTimeoutError, describeLibraryFailure, type LibraryTask } from "./libraryFailure";

const http = (status: number) => new HttpError("https://backend.test/x", status, '{"message":"Error while searching."}');
const TASKS: LibraryTask[] = ["search", "answer", "write"];

afterEach(() => vi.restoreAllMocks());

describe("describeLibraryFailure", () => {
  it.each(TASKS)("never shows a status code, a browser's wording or the server's own message (%s)", (task) => {
    const errors = [
      http(400),
      http(401),
      http(403),
      http(404),
      http(408),
      http(429),
      http(500),
      http(502),
      http(503),
      http(504),
      new TypeError("Failed to fetch"),
      new Error("NetworkError when attempting to fetch resource."),
      new RequestTimeoutError(),
      new Error("boom"),
      "a string",
      undefined,
      null,
      { name: "Weird", code: "X" },
    ];
    for (const error of errors) {
      const { message } = describeLibraryFailure(error, task);
      expect(message).not.toMatch(/HTTP|\b[45]\d\d\b|Failed to fetch|NetworkError|Error while searching|boom|undefined|object/);
      expect(message.length).toBeGreaterThan(20);
      expect(message.endsWith(".")).toBe(true);
    }
  });

  it("calls a request that was given up on, or answered with a time-out, slow", () => {
    for (const error of [new RequestTimeoutError(), http(504), http(408)]) {
      for (const task of TASKS) expect(describeLibraryFailure(error, task).kind).toBe("slow");
    }
    const named = new Error("x");
    named.name = "TimeoutError";
    expect(describeLibraryFailure(named, "write").kind).toBe("slow");
  });

  it("calls a service that answers with bad gateway or unavailable down, in the words for what was being done", () => {
    for (const status of [502, 503]) {
      expect(describeLibraryFailure(http(status), "search")).toEqual({
        kind: "down",
        message: "Search isn't responding right now. Please try again in a few minutes.",
        retryable: true,
      });
      expect(describeLibraryFailure(http(status), "answer").message).toBe("The written answer isn't available right now.");
      expect(describeLibraryFailure(http(status), "write").message).toBe(
        "The writing service isn't responding right now. Please try again in a few minutes.",
      );
    }
  });

  it("calls too many requests busy, with words for each task", () => {
    expect(describeLibraryFailure(http(429), "search")).toMatchObject({ kind: "busy", retryable: true });
    expect(describeLibraryFailure(http(429), "search").message).toBe("You've searched a lot in a short time. Wait a minute, then try again.");
    expect(describeLibraryFailure(http(429), "write").message).toBe(
      "Too many messages are being written right now. Wait a minute, then try again.",
    );
  });

  it("says the sign-in has ended, and that trying again will not help, for a 401", () => {
    expect(describeLibraryFailure(http(401), "write")).toEqual({
      kind: "signin",
      message: "Your sign-in has ended. Reload the page to sign in again.",
      retryable: false,
    });
  });

  it("says there is no access, and that trying again will not help, for a 403", () => {
    expect(describeLibraryFailure(http(403), "search")).toMatchObject({ kind: "denied", retryable: false });
  });

  it("says the results are gone for a message, and that nothing was found otherwise, for a 404", () => {
    expect(describeLibraryFailure(http(404), "write")).toMatchObject({ kind: "missing", retryable: true });
    expect(describeLibraryFailure(http(404), "write").message).toMatch(/aren't in your search any more/);
    expect(describeLibraryFailure(http(404), "search").message).toBe("We couldn't find that. Please search again.");
  });

  it("tells a browser that cannot reach the server apart from a person who is offline", () => {
    const reach = describeLibraryFailure(new TypeError("Failed to fetch"), "search");
    expect(reach.kind).toBe("unreachable");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const offline = describeLibraryFailure(new TypeError("Failed to fetch"), "search");
    expect(offline).toEqual({
      kind: "offline",
      message: "You seem to be offline. Check your connection, then try again.",
      retryable: true,
    });
  });

  it("recognises the network failures other browsers word differently", () => {
    for (const message of ["Load failed", "NetworkError when attempting to fetch resource.", "Network request failed"]) {
      expect(describeLibraryFailure(new Error(message), "write").kind).toBe("unreachable");
    }
  });

  it("does not call a bug in the page a lost connection", () => {
    const bug = new TypeError("Cannot read properties of undefined (reading 'text')");
    expect(describeLibraryFailure(bug, "write").kind).toBe("other");
    expect(describeLibraryFailure(bug, "search").kind).toBe("other");
  });

  it("keeps any other failure general, and allows a second try", () => {
    for (const error of [http(500), http(400), new Error("boom"), "oops", undefined]) {
      expect(describeLibraryFailure(error, "write")).toEqual({
        kind: "other",
        message: "Couldn't write that just now. Please try again.",
        retryable: true,
      });
    }
    expect(describeLibraryFailure(http(500), "search").message).toBe("Couldn't run that search just now. Please try again.");
  });
});
