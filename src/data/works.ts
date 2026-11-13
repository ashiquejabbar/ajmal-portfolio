// Generated media list — regenerate with scripts/process-works.py (see README).
import raw from "./works.json";

export type WorkItem = {
  id: string;
  type: "image" | "video";
  w: number;
  h: number;
  src: string;
  thumb?: string;
  preview?: string;
  poster?: string;
  posterSm?: string; // ~900px webp for grid tiles
  posterXs?: string; // ~480px webp for phone tiles
  thumbXs?: string; // ~480px webp for phone tiles
  card?: string; // ~1000px webp for the "Selected reels" cards
  fallback?: string; // H.264 copy for browsers that can't play the original codec
  player?: "drive"; // src is a Google Drive preview URL — played in Drive's own player
  mobile?: string; // 1080p H.264 copy played on phones in the native player (Drive's covers the video)
  driveId?: string; // Drive file id — with NEXT_PUBLIC_DRIVE_API_KEY the original streams via the Drive API
  codec?: "h264" | "hevc";
  original?: boolean; // true = the untouched master file
  drive?: string; // link to the full-resolution file on Google Drive
  duration?: number;
  category: string;
  categorySlug: string;
  title: string;
  group: string | null;
};

export const works = raw as WorkItem[];

// Order the filter chips appear in (categories not listed go last).
const ORDER = ["real-estate", "fnb", "menu", "fitness", "pet-care", "travel", "events", "birthdays"];

export const categories = Array.from(new Map(works.map((w) => [w.categorySlug, w.category])))
  .map(([slug, label]) => ({ slug, label, count: works.filter((w) => w.categorySlug === slug).length }))
  .sort((a, b) => {
    const ia = ORDER.indexOf(a.slug), ib = ORDER.indexOf(b.slug);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

/** Videos first, then photos — interleaved across categories so "All" opens with variety. */
export const allOrdered = (() => {
  const byCat = categories.map((c) => {
    const items = works.filter((w) => w.categorySlug === c.slug);
    return [...items.filter((w) => w.type === "video"), ...items.filter((w) => w.type === "image")];
  });
  const out: WorkItem[] = [];
  for (let i = 0; out.length < works.length; i++) byCat.forEach((list) => list[i] && out.push(list[i]));
  return out;
})();

export const fmtDuration = (s?: number) =>
  s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "";

/** Lets other sections (e.g. the reel cards) open the viewer. */
export const openWork = (id: string) => window.dispatchEvent(new CustomEvent("open-work", { detail: id }));
