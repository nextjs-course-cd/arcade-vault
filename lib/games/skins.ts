// Infraestructura compartida de skins de la plataforma. Un solo estado de
// preferencia global (localStorage), no por juego — mismo patrón que
// `av_user` en lib/auth.tsx.

export type ArcadeSkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: ArcadeSkinId[] = ["clasico", "neon", "retro"];

export const SKIN_LABELS: Record<ArcadeSkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

export const DEFAULT_SKIN: ArcadeSkinId = "clasico";

const SKIN_STORAGE_KEY = "av_skin";

export function readStoredSkin(): ArcadeSkinId {
  if (typeof window === "undefined") return DEFAULT_SKIN;
  try {
    const raw = window.localStorage.getItem(SKIN_STORAGE_KEY);
    return SKIN_IDS.includes(raw as ArcadeSkinId) ? (raw as ArcadeSkinId) : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

export function writeStoredSkin(skin: ArcadeSkinId): void {
  try {
    window.localStorage.setItem(SKIN_STORAGE_KEY, skin);
  } catch {
    // localStorage no disponible (modo privado, cuota) — no bloquea el juego.
  }
}
