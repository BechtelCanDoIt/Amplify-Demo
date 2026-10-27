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

import { describe, expect, it } from "vitest";
import {
  COMPOSE_OPTIONS,
  MAX_COMPOSE_SOURCES,
  MAX_NAME_LENGTH,
  MAX_PURPOSE_LENGTH,
  asksForNames,
  asksForPurpose,
  buildMessageHtml,
  buildMessageText,
  cleanName,
  cleanPurpose,
  cleanSubject,
  subjectOf,
  type MessageParts,
} from "./libraryCompose";

describe("the kinds of message", () => {
  it("offers an email, a chat message, a plain summary, an explanation and something else, in that order", () => {
    expect(COMPOSE_OPTIONS.map((option) => option.id)).toEqual(["email", "chat", "plain", "explain", "custom"]);
    expect(COMPOSE_OPTIONS.every((option) => option.title !== "" && option.hint !== "")).toBe(true);
  });

  it("asks for names only for an email", () => {
    expect(asksForNames("email")).toBe(true);
    expect(["chat", "plain", "explain", "custom"].some((kind) => asksForNames(kind as never))).toBe(false);
  });

  it("asks what it is for only when the seller picks something else", () => {
    expect(asksForPurpose("custom")).toBe(true);
    expect(["email", "chat", "plain", "explain"].some((kind) => asksForPurpose(kind as never))).toBe(false);
  });
});

describe("cleanPurpose", () => {
  it("drops the spaces around what was typed, and keeps the line breaks inside", () => {
    expect(cleanPurpose("  a note for the CTO\nabout security  ")).toBe("a note for the CTO\nabout security");
  });

  it("cuts what is too long, and leaves nothing for a blank one", () => {
    expect(cleanPurpose("x".repeat(900))).toHaveLength(MAX_PURPOSE_LENGTH);
    expect(cleanPurpose(" \n  ")).toBe("");
  });
});

describe("cleanName", () => {
  it("puts a name on one line, without stray spaces", () => {
    expect(cleanName("  Alex \n  Perera  ")).toBe("Alex Perera");
  });

  it("cuts a name that is too long, and leaves nothing for a blank one", () => {
    expect(cleanName("x".repeat(200))).toHaveLength(MAX_NAME_LENGTH);
    expect(cleanName("   ")).toBe("");
  });
});

describe("subjectOf", () => {
  it("makes the question a proper subject: a capital, and no closing punctuation", () => {
    expect(subjectOf("how is the gold tier priced?")).toBe("How is the gold tier priced");
    expect(subjectOf("  pricing ?! ")).toBe("Pricing");
  });

  it("shortens a long question to fit a subject line", () => {
    const subject = subjectOf("word ".repeat(60));
    expect(subject.length).toBeLessThanOrEqual(80);
    expect(subject.endsWith("…")).toBe(true);
  });
});

const URL_ONE = "https://docs.google.com/presentation/d/abc/present?slide=id.p5";
const URL_TWO = "https://drive.google.com/file/d/xyz/view";

const parts = (overrides: Partial<MessageParts> = {}): MessageParts => ({
  intent: "email",
  body: "The deck shows how WSO2 priced the gold tier.\n\nThe guide covers renewals.",
  query: "How is the gold tier priced?",
  sources: [
    { title: "Pricing Deck", location: "Slide 5", url: URL_ONE },
    { title: "Renewal Guide", location: null, url: URL_TWO },
  ],
  customerName: "Alex",
  senderName: "Sam",
  ...overrides,
});

describe("cutting text to a length", () => {
  it("counts an emoji as one character, so it is never cut in half", () => {
    const emoji = "😀";
    expect(Array.from(cleanPurpose(emoji.repeat(600)))).toHaveLength(MAX_PURPOSE_LENGTH);
    expect(cleanPurpose(emoji.repeat(600)).endsWith(emoji)).toBe(true);
    expect(Array.from(cleanName(emoji.repeat(100)))).toHaveLength(MAX_NAME_LENGTH);
    expect(cleanName(emoji.repeat(100)).endsWith(emoji)).toBe(true);
  });

  it("keeps a subject of 120 characters even when they are emoji, and drops one of 121", () => {
    expect(cleanSubject("😀".repeat(120))).toBe("😀".repeat(120));
    expect(cleanSubject("😀".repeat(121))).toBe("");
  });

  it("shortens a long question used as a subject at a whole character", () => {
    const subject = subjectOf("😀".repeat(200));
    expect(Array.from(subject).length).toBeLessThanOrEqual(80);
    expect(subject.endsWith("…")).toBe(true);
    expect(subject).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
  });
});

describe("only secure addresses are linked", () => {
  it("leaves out a source whose address is not https, in every kind of message", () => {
    const sources = [
      { title: "Plain http", location: null, url: "http://example.com/a" },
      { title: "Script", location: null, url: "javascript:alert(1)" },
      { title: "Secure", location: null, url: "https://example.com/b" },
    ];
    for (const intent of ["email", "chat", "plain", "custom"] as const) {
      const text = buildMessageText(parts({ intent, sources }));
      expect(text).toContain("https://example.com/b");
      expect(text).not.toContain("http://example.com");
      expect(text).not.toContain("javascript:");
    }
    const html = buildMessageHtml(parts({ sources })) ?? "";
    expect(html).toContain('href="https://example.com/b"');
    expect(html).not.toContain("javascript:");
  });
});

describe("cleanSubject", () => {
  it("puts a subject on one line, without stray spaces", () => {
    expect(cleanSubject("  Gold tier,\n in plain   words ")).toBe("Gold tier, in plain words");
  });

  it("is empty when there is nothing, or when it is too long to be a subject", () => {
    expect(cleanSubject(undefined)).toBe("");
    expect(cleanSubject(null)).toBe("");
    expect(cleanSubject("   ")).toBe("");
    expect(cleanSubject("x".repeat(121))).toBe("");
    expect(cleanSubject("x".repeat(120))).toHaveLength(120);
  });
});

describe("the subject of an email", () => {
  it("is the one the model wrote, not the question", () => {
    const text = buildMessageText(parts({ subject: "Gold tier pricing, ahead of your renewal" }));
    expect(text.startsWith("Subject: Gold tier pricing, ahead of your renewal\n\nHi Alex,")).toBe(true);
    expect(text).not.toContain("How is the gold tier priced");
    expect(buildMessageHtml(parts({ subject: "Gold tier pricing, ahead of your renewal" })) ?? "").toContain(
      "<p>Subject: Gold tier pricing, ahead of your renewal</p>",
    );
  });

  it("is made from the question when the model wrote none, or none that can be used", () => {
    for (const subject of [undefined, null, "", "  ", "x".repeat(200)]) {
      expect(buildMessageText(parts({ subject })).startsWith("Subject: How is the gold tier priced\n")).toBe(true);
    }
  });

  it("escapes anything that could be read as markup in the html", () => {
    expect(buildMessageHtml(parts({ subject: "<b>Big</b> & bold" })) ?? "").toContain("&lt;b&gt;Big&lt;/b&gt; &amp; bold");
  });

  it("is only used for an email", () => {
    expect(buildMessageText(parts({ intent: "chat", body: "Hi.", subject: "A subject", sources: [] }))).toBe("Hi.");
  });
});

describe("buildMessageText as an email", () => {
  it("puts the names, the written text, a link to every source and a sign-off in place", () => {
    expect(buildMessageText(parts())).toBe(
      [
        "Subject: How is the gold tier priced",
        "",
        "Hi Alex,",
        "",
        "The deck shows how WSO2 priced the gold tier.\n\nThe guide covers renewals.",
        "",
        "Where to find them:",
        "1. Pricing Deck (Slide 5)",
        URL_ONE,
        "2. Renewal Guide",
        URL_TWO,
        "",
        "Best regards,",
        "Sam",
      ].join("\n"),
    );
  });

  it("says it where there is only one source", () => {
    const text = buildMessageText(parts({ sources: [{ title: "Pricing Deck", location: "Slide 5", url: URL_ONE }] }));
    expect(text).toContain("Where to find it:\n1. Pricing Deck (Slide 5)");
  });

  it("leaves places to fill in when the names are skipped", () => {
    const text = buildMessageText(parts({ customerName: "", senderName: "  " }));
    expect(text).toContain("Hi [Name],");
    expect(text).toContain("Best regards,\n[Your name]");
  });

  it("leaves out a source with nowhere safe to open, and the whole list when none can be opened", () => {
    const some = buildMessageText(parts({ sources: [{ title: "Pricing Deck", location: null, url: null }, ...parts().sources.slice(1)] }));
    expect(some).not.toContain("Pricing Deck");
    expect(some).toContain("1. Renewal Guide");
    const none = buildMessageText(parts({ sources: [{ title: "Pricing Deck", location: null, url: null }] }));
    expect(none).not.toContain("Where to find");
    expect(none).not.toContain("http");
  });

  it("is just the greeting, the text and the sign-off when nothing was used", () => {
    expect(buildMessageText(parts({ sources: [] }))).not.toContain("Where to find");
  });
});

describe("buildMessageText for the other kinds", () => {
  it("adds every source and its link to a chat message", () => {
    expect(buildMessageText(parts({ intent: "chat", body: "Worth a look." }))).toBe(
      `Worth a look.\n• Pricing Deck (Slide 5) ${URL_ONE}\n• Renewal Guide ${URL_TWO}`,
    );
  });

  it("is just the written text for a chat message with no link", () => {
    expect(buildMessageText(parts({ intent: "chat", body: "Worth a look.", sources: [] }))).toBe("Worth a look.");
  });

  it("lists the sources under a plain summary", () => {
    expect(buildMessageText(parts({ intent: "plain", body: "Covers pricing." }))).toBe(
      `Covers pricing.\n\nSources:\n1. Pricing Deck (Slide 5) - ${URL_ONE}\n2. Renewal Guide - ${URL_TWO}`,
    );
    expect(buildMessageText(parts({ intent: "plain", body: "Covers pricing.", sources: [] }))).toBe("Covers pricing.");
  });

  it("ends what the seller asked for with where it came from", () => {
    expect(buildMessageText(parts({ intent: "custom", body: "Covers the security controls." }))).toBe(
      `Covers the security controls.\n\nSources:\n1. Pricing Deck (Slide 5) - ${URL_ONE}\n2. Renewal Guide - ${URL_TWO}`,
    );
  });

  it("is only the written text for an explanation", () => {
    expect(buildMessageText(parts({ intent: "explain", body: "Use them when asked about pricing." }))).toBe(
      "Use them when asked about pricing.",
    );
  });
});

describe("buildMessageHtml", () => {
  it("makes every source a clickable link in the email", () => {
    const html = buildMessageHtml(parts()) ?? "";
    expect(html).toContain(`<a href="${URL_ONE}">Pricing Deck (Slide 5)</a>`);
    expect(html).toContain(`<a href="${URL_TWO}">Renewal Guide</a>`);
    expect(html).toContain("<p>Hi Alex,</p>");
    expect(html).toContain("<p>Where to find them:</p>");
    expect(html).toContain("Best regards,<br>Sam");
  });

  it("escapes anything that could be read as markup, in the text, the names, the titles and the addresses", () => {
    const html =
      buildMessageHtml(
        parts({
          body: "<script>alert(1)</script> & more",
          customerName: "<b>A</b>",
          sources: [{ title: "<i>Deck</i>", location: null, url: 'https://x.test/?a="b"' }],
        }),
      ) ?? "";
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<i>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; more");
    expect(html).toContain("&quot;b&quot;");
  });

  it("keeps the line breaks of the written text", () => {
    expect(buildMessageHtml(parts({ body: "one\ntwo" })) ?? "").toContain("one<br>two");
  });

  it("is only made for an email", () => {
    for (const intent of ["chat", "plain", "explain", "custom"] as const) {
      expect(buildMessageHtml(parts({ intent }))).toBeNull();
    }
  });
});

describe("the most sources", () => {
  it("is the same as the backend's", () => {
    expect(MAX_COMPOSE_SOURCES).toBe(10);
  });
});
