import type { Book, PlanId } from "@/types";
import { planById } from "./plans";

/**
 * The three plans as cased "volumes" for the 3D plans hero. They are drawn by
 * the same cover painter as the catalogue, in the plan cloths from the theme
 * (theme.scene.planBooks). Thickness grows with the plan.
 */
const volume = (id: PlanId, v: Pick<Book, "emblem" | "trim" | "pages" | "isbn">): Book => {
  const plan = planById(id);
  return {
    id: `plan-${id}`,
    slug: `plan-${id}`,
    title: plan.name,
    coverLines: [plan.name],
    author: "StoryShelf",
    genre: "Essays",
    finish: "cloth",
    swatch: 0,
    planSwatch: id,
    mrp: plan.price,
    language: "English",
    published: "2026",
    plan: id,
    synopsis: plan.tagline,
    blurb: plan.tagline,
    ...v,
  };
};

export const planBooks: Book[] = [
  volume("kickstart", { emblem: "key", trim: { width: 140, height: 216 }, pages: 150, isbn: "978-93-48201-90-1" }),
  volume("levelUp", { emblem: "compass", trim: { width: 152, height: 229 }, pages: 300, isbn: "978-93-48201-91-8" }),
  volume("pro", { emblem: "tree", trim: { width: 156, height: 234 }, pages: 520, isbn: "978-93-48201-92-5" }),
];
