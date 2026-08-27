import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  parseGameSettings,
  readGameSettings,
  writeGameSettings,
} from "./settings";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("game settings", () => {
  it("uses visible controls by default", () => {
    expect(parseGameSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseGameSettings("not-json")).toEqual(DEFAULT_SETTINGS);
  });

  it("persists the control button preference", () => {
    const storage = createStorage();
    writeGameSettings({ showControlButtons: false }, storage);
    expect(storage.getItem(SETTINGS_KEY)).toBe('{"showControlButtons":false}');
    expect(readGameSettings(storage)).toEqual({ showControlButtons: false });
  });
});
