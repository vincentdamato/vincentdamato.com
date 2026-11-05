import wallpaperUrl from "./assets/wallpaper.webp";

const photo = new Image();
export const wallpaperReady = new Promise<void>((resolve) => {
  photo.onload = () => resolve();
  photo.onerror = () => resolve();
});
photo.src = wallpaperUrl;

/** Draws the desktop background, cropped to fill the given size. */
export function drawWallpaper(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = "#8a7a68";
  c.fillRect(0, 0, w, h);
  if (!photo.naturalWidth) return;
  const k = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
  const dw = photo.naturalWidth * k;
  const dh = photo.naturalHeight * k;
  c.drawImage(photo, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

export const DESKTOP_ICONS: { label: string; color: string; glyph: string }[] = [
  { label: "Résumé", color: "#3d6fb4", glyph: "R" },
  { label: "Projects", color: "#7a4fb0", glyph: "{ }" },
  { label: "Notes", color: "#7d8a99", glyph: "≡" },
  { label: "Markets", color: "#a81620", glyph: "▲" },
  { label: "Calculator", color: "#4a5a6a", glyph: "=" },
];
