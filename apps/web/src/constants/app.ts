export const APP_NAME = "Filomonline";
export const APP_KEY = "filomonline";

// Redirect Paths
export const REDIRECT_URL_KEY = "redirect";
export const HOME_PATH = "/";
export const GHOST_ENTRY_PATH = "/login";

// Navigation Types
export type NavigationType = "root" | "group" | "collapse" | "item" | "divider";

export const COLORS = [
  "neutral",
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "error",
] as const;

export type ColorType = (typeof COLORS)[number];
