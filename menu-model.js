import { SECTIONS } from "./menu-config.js";
import { DUPLICATE_PAIRS } from "./duplicate-cleanup.js";

export const CLEANUP_VERSION = "duplicate-import-2026-09-v1";
export const clone = (value) => structuredClone(value);
export const ordered = (values) =>
  [...values].sort(
    (a, b) =>
      (Number(a.order) || 0) - (Number(b.order) || 0) ||
      String(a.key || a.id).localeCompare(String(b.key || b.id)),
  );
export const defaults = () =>
  SECTIONS.map((section, order) => ({ ...section, order, hidden: false }));

export function dietaryFlag(dish, type) {
  const keys = {
    vegetarian: "isVegetarian",
    spicy: "isSpicy",
    glutenfree: "isGlutenFree",
  };
  if (dish[keys[type]] !== undefined) return !!dish[keys[type]];
  const text = `${dish.name || ""} ${dish.desc || ""}`;
  const terms = {
    vegetarian: [
      "צמחוני",
      "טבעוני",
      "חלומי",
      "גבינ",
      "פטה",
      "סלט",
      "שקשוקה",
      "קרואסון חמאה",
    ],
    spicy: ["חריף", "פיקנטי", "צ׳ילי", "סומאק", "לבנה חריפה"],
    glutenfree: ["ללא גלוטן", "סלמון", "פילה אנגוס", "קרפצ׳יו", "פירות ים"],
  };
  if (
    type === "glutenfree" &&
    [
      "פסטה",
      "לחם",
      "ג׳בטה",
      "קרואסון",
      "שניצל",
      "טוסט",
      "קרוטונים",
      "פוקצ׳ה",
    ].some((term) => text.includes(term))
  )
    return false;
  return (terms[type] || []).some((term) => text.includes(term));
}

export function sameData(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const keys = Object.keys(a).sort();
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && sameData(a[key], b[key]))
  );
}

export function cleanKnownDuplicates(state) {
  if (state.migrations?.[CLEANUP_VERSION]) return [];
  const archived = [];
  for (const pair of DUPLICATE_PAIRS) {
    const duplicate = state.dishes.find((d) => d.id === pair.duplicateId);
    const canonical = state.dishes.find((d) => d.id === pair.canonicalId);
    if (!duplicate || !canonical || canonical.archived || duplicate.archived)
      continue;
    const { id, ...data } = duplicate;
    // Only the audited, unchanged import records qualify. Names are not identities.
    if (!sameData(data, pair.duplicateData)) continue;
    archived.push(clone(duplicate));
    Object.assign(duplicate, {
      archived: true,
      duplicateOf: canonical.id,
      archivedReason: CLEANUP_VERSION,
    });
  }
  state.migrations = { ...state.migrations, [CLEANUP_VERSION]: true };
  return archived;
}

export function normalizeState(data) {
  const state = {
    schemaVersion: 1,
    revision: 0,
    migrations: {},
    ...clone(data),
  };
  state.sections = ordered(state.sections || defaults());
  state.dishes ||= [];
  // Keep older custom categories reachable instead of dropping their items.
  for (const dish of state.dishes) {
    if (!state.sections.some((s) => s.key === dish.section)) {
      state.sections.push({
        key: dish.section,
        title: dish.section || "ללא קטגוריה",
        short: "",
        order: state.sections.length,
        hidden: false,
      });
    }
  }
  return state;
}

export function saveDishInState(state, id, values) {
  if (!values.name?.trim()) throw new Error("יש להזין שם לפריט");
  if (!state.sections.some((s) => s.key === values.section))
    throw new Error("יש לבחור קטגוריה קיימת");
  const existing = state.dishes.find((d) => d.id === id);
  const order =
    !existing || existing.section !== values.section
      ? state.dishes
          .filter((d) => d.section === values.section && d.id !== id)
          .reduce((max, d) => Math.max(max, Number(d.order) || 0), -1) + 1
      : existing.order;
  const next = { ...existing, ...values, name: values.name.trim(), id, order };
  if (existing) Object.assign(existing, next);
  else state.dishes.push(next);
}

export function moveItem(state, kind, id, step) {
  const list = kind === "sections" ? state.sections : state.dishes;
  const field = kind === "sections" ? "key" : "id";
  const item = list.find((value) => value[field] === id);
  if (!item) throw new Error("הפריט כבר אינו קיים");
  const siblings = ordered(
    kind === "sections"
      ? list
      : list.filter((d) => d.section === item.section && !d.archived),
  );
  const current = siblings.findIndex((d) => d[field] === id);
  const target = current + step;
  if (target < 0 || target >= siblings.length) return;
  [siblings[current], siblings[target]] = [siblings[target], siblings[current]];
  siblings.forEach((entry, order) => {
    entry.order = order;
  });
}

export function saveSectionInState(state, key, values) {
  const title = values.title?.trim();
  if (!title) throw new Error("יש להזין שם לקטגוריה");
  if (state.sections.some((s) => s.key !== key && s.title.trim() === title))
    throw new Error("כבר קיימת קטגוריה בשם זה");
  const existing = state.sections.find((s) => s.key === key);
  const next = {
    ...existing,
    ...values,
    key,
    title,
    short: values.short?.trim() || title,
    order: existing?.order ?? state.sections.length,
  };
  if (existing) Object.assign(existing, next);
  else state.sections.push(next);
}

export function removeSectionInState(state, key, destination) {
  if (!state.sections.some((s) => s.key === key))
    throw new Error("הקטגוריה כבר אינה קיימת");
  const members = state.dishes.filter((d) => d.section === key);
  if (members.length) {
    if (
      !destination ||
      destination === key ||
      !state.sections.some((s) => s.key === destination)
    )
      throw new Error("יש לבחור קטגוריה להעברת הפריטים לפני המחיקה");
    let order =
      state.dishes
        .filter((d) => d.section === destination)
        .reduce((max, d) => Math.max(max, Number(d.order) || 0), -1) + 1;
    ordered(members).forEach((d) => {
      d.section = destination;
      d.order = order++;
    });
  }
  state.sections = ordered(state.sections.filter((s) => s.key !== key));
  state.sections.forEach((s, order) => {
    s.order = order;
  });
}
