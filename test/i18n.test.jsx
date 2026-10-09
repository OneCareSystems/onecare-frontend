
import { describe, it, expect, beforeEach } from "vitest";
import i18n from "../src/i18n";

describe("CFG-06 - i18n configuration", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("AC1: loads Tamil translations", async () => {
    await i18n.changeLanguage("ta");

    expect(i18n.t("patient.dashboard")).toBe(
      "நோயாளர் முகப்புப் பக்கம்"
    );
  });

  it("AC2: falls back to English for a missing Tamil key", async () => {
    await i18n.addResource(
      "en",
      "translation",
      "test.onlyEnglish",
      "English fallback text"
    );

    await i18n.changeLanguage("ta");

    expect(i18n.t("test.onlyEnglish")).toBe(
      "English fallback text"
    );
  });
});