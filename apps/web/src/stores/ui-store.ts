import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type ThemePref = "light" | "dark" | "system"
export const THEME_STORAGE_KEY = "nutrisense-theme"

interface UiState {
  theme: ThemePref
  setTheme: (t: ThemePref) => void
}

export const useUiStore = create<UiState>()(
  persist((set) => ({ theme: "system", setTheme: (theme) => set({ theme }) }), {
    name: THEME_STORAGE_KEY,
    storage: createJSONStorage(() => localStorage),
  }),
)

export function resolveTheme(
  pref: ThemePref,
  systemDark: boolean,
): "light" | "dark" {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref
}
