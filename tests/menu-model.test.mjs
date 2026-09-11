import test from "node:test";
import assert from "node:assert/strict";
import { DUPLICATE_PAIRS } from "../duplicate-cleanup.js";
import {
  normalizeState,
  cleanKnownDuplicates,
  saveDishInState,
  saveSectionInState,
  removeSectionInState,
  moveItem,
  ordered,
  dietaryFlag,
} from "../menu-model.js";
const sample = () =>
  normalizeState({
    dishes: DUPLICATE_PAIRS.flatMap((p) => [
      { ...structuredClone(p.duplicateData), id: p.canonicalId },
      { ...structuredClone(p.duplicateData), id: p.duplicateId },
    ]),
  });

test("archives only audited copies, preserving edited originals and deliberate restorations", () => {
  const state = sample();
  state.dishes[0].desc = "An intentional custom edit";
  state.dishes.push({
    id: "variant",
    name: state.dishes[0].name,
    section: "kids",
    price: "20",
    order: 7,
  });
  assert.equal(cleanKnownDuplicates(state).length, 48);
  assert.equal(state.dishes.filter((d) => !d.archived).length, 49);
  assert.equal(state.dishes[0].desc, "An intentional custom edit");
  state.dishes[1].archived = false;
  assert.equal(cleanKnownDuplicates(state).length, 0);
  assert.equal(state.dishes[1].archived, false);
});
test("skips changed copies, absent originals, and archived originals", () => {
  const state = sample();
  state.dishes[1].price = "999";
  state.dishes[2].archived = true;
  state.dishes = state.dishes.filter(
    (d) => d.id !== DUPLICATE_PAIRS[2].canonicalId,
  );
  assert.equal(cleanKnownDuplicates(state).length, 45);
  assert.equal(
    state.dishes.find((d) => d.id === DUPLICATE_PAIRS[0].duplicateId).price,
    "999",
  );
});
test("saving a stable draft ID twice creates one item and moving appends it", () => {
  const state = normalizeState({
    dishes: [{ id: "old", name: "Old", section: "salads", order: 5 }],
  });
  const values = { name: "New", section: "breakfast", price: "18" };
  saveDishInState(state, "draft", values);
  saveDishInState(state, "draft", values);
  assert.equal(state.dishes.length, 2);
  saveDishInState(state, "draft", { ...values, section: "salads" });
  assert.equal(state.dishes.find((d) => d.id === "draft").order, 6);
  assert.throws(() =>
    saveDishInState(state, "bad", { name: " ", section: "salads" }),
  );
  assert.throws(() =>
    saveDishInState(state, "bad", { name: "Item", section: "missing" }),
  );
});
test("reordering tied positions changes the visible order and normalizes positions", () => {
  const state = normalizeState({
    dishes: ["a", "b", "c"].map((id) => ({
      id,
      section: "breakfast",
      order: 0,
    })),
  });
  moveItem(state, "dishes", "b", -1);
  assert.deepEqual(
    ordered(state.dishes).map((d) => d.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    ordered(state.dishes).map((d) => d.order),
    [0, 1, 2],
  );
});
test("category removal moves active and archived members and rejects missing destination", () => {
  const state = normalizeState({
    dishes: [
      { id: "a", section: "breakfast", order: 0 },
      { id: "b", section: "breakfast", order: 0, archived: true },
      { id: "c", section: "salads", order: 10 },
    ],
  });
  assert.throws(() => removeSectionInState(state, "breakfast", ""));
  removeSectionInState(state, "breakfast", "salads");
  assert.equal(
    state.sections.some((s) => s.key === "breakfast"),
    false,
  );
  assert.ok(state.dishes.every((d) => d.section === "salads"));
  assert.equal(state.dishes.find((d) => d.id === "b").archived, true);
  assert.deepEqual(
    ordered(state.dishes).map((d) => d.order),
    [10, 11, 12],
  );
});
test("renaming and hiding retain the section identity; repeated saves do not duplicate it", () => {
  const state = normalizeState({ dishes: [] });
  saveSectionInState(state, "drinks", {
    title: "Hot drinks",
    short: "Hot",
    hidden: true,
  });
  saveSectionInState(state, "drinks", {
    title: "Hot drinks",
    short: "Hot",
    hidden: false,
  });
  assert.equal(state.sections.filter((s) => s.key === "drinks").length, 1);
  assert.throws(() =>
    saveSectionInState(state, "other", { title: "Hot drinks" }),
  );
});
test("explicit dietary choices override legacy inference", () => {
  assert.equal(dietaryFlag({ name: "סלט חלומי" }, "vegetarian"), true);
  assert.equal(
    dietaryFlag({ name: "סלט חלומי", isVegetarian: false }, "vegetarian"),
    false,
  );
});
