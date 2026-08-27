export interface GameSettings {
  showControlButtons: boolean;
}

interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SETTINGS_KEY = "dino-run:settings:v1";
export const DEFAULT_SETTINGS: GameSettings = { showControlButtons: true };

export function parseGameSettings(value: string | null): GameSettings {
  if (!value) return { ...DEFAULT_SETTINGS };
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    const settings = parsed as Partial<GameSettings>;
    return {
      showControlButtons: typeof settings.showControlButtons === "boolean"
        ? settings.showControlButtons
        : DEFAULT_SETTINGS.showControlButtons,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function readGameSettings(
  storage: SettingsStorage | undefined = typeof localStorage === "undefined"
    ? undefined
    : localStorage,
): GameSettings {
  try {
    return parseGameSettings(storage?.getItem(SETTINGS_KEY) ?? null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeGameSettings(
  settings: GameSettings,
  storage: SettingsStorage | undefined = typeof localStorage === "undefined"
    ? undefined
    : localStorage,
): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings remain active for this page even if persistence is unavailable.
  }
}
