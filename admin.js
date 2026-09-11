import * as store from "./menu-store.js";
import { ordered, clone, dietaryFlag } from "./menu-model.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let state = { sections: [], dishes: [] },
  tab = "items",
  draft,
  sectionDraft,
  dirty = false,
  sectionDirty = false,
  busy = false,
  photoBusy = false,
  visits = null;
let toastTimer;
const dishForm = $("#dishForm"),
  sectionForm = $("#sectionForm");
const field = (name) => dishForm.elements.namedItem(name);
const sectionField = (name) => sectionForm.elements.namedItem(name);
function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2800);
}
function errorMessage(error) {
  console.error(error);
  return error.code
    ? "השמירה לא הצליחה. בדקו את החיבור וההרשאות ונסו שוב."
    : error.message;
}
function pageError(error) {
  $("#pageError").hidden = false;
  $("#pageError").textContent = errorMessage(error);
}
function options(selected = "", exclude = "") {
  return ordered(state.sections)
    .filter((s) => s.key !== exclude)
    .map(
      (s) =>
        `<option value="${esc(s.key)}" ${s.key === selected ? "selected" : ""}>${esc(s.title)}${s.hidden ? " (מוסתרת)" : ""}</option>`,
    )
    .join("");
}

function render() {
  $("#loading").hidden = true;
  $("#activeCount").textContent = state.dishes.filter(
    (d) => !d.archived,
  ).length;
  $("#archiveCount").textContent = state.dishes.filter(
    (d) => d.archived,
  ).length;
  $$("[data-tab]").forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  $("#itemsPanel").hidden = !["items", "archive"].includes(tab);
  $("#sectionsPanel").hidden = tab !== "sections";
  $("#statsPanel").hidden = tab !== "stats";
  $("#listTitle").textContent =
    tab === "archive" ? "ארכיון הפריטים" : "פריטי התפריט";
  $("#listHint").textContent =
    tab === "archive"
      ? "פריטים בארכיון אינם מוצגים ללקוחות. ניתן לשחזר אותם בכל זמן."
      : "בחרו פריט לעריכה, או הוסיפו משהו חדש.";
  $("#addDishBtn").hidden = tab === "archive";
  $("#addDishBtn").disabled = !state.sections.length;
  const selected = $("#categoryFilter").value;
  $("#categoryFilter").innerHTML =
    '<option value="all">כל הקטגוריות</option>' + options(selected);
  if (!state.sections.some((s) => s.key === selected))
    $("#categoryFilter").value = "all";
  renderItems();
  renderSections();
  renderStats();
}

function renderItems() {
  const search = $("#searchInput").value.trim().toLocaleLowerCase();
  const category = $("#categoryFilter").value;
  const matches = state.dishes.filter(
    (d) =>
      !!d.archived === (tab === "archive") &&
      (category === "all" || category === d.section) &&
      `${d.name} ${d.desc || ""}`.toLocaleLowerCase().includes(search),
  );
  $("#resultCount").textContent = `${matches.length} פריטים`;
  let html = "";
  for (const section of ordered(state.sections)) {
    const members = ordered(matches.filter((d) => d.section === section.key));
    if (!members.length) continue;
    html += `<h3 class="group-heading">${esc(section.title)} <span>${members.length} פריטים${section.hidden ? " · קטגוריה מוסתרת" : ""}</span></h3>`;
    const allMembers = ordered(
      state.dishes.filter((d) => d.section === section.key && !d.archived),
    );
    for (const dish of members) {
      const index = allMembers.findIndex((d) => d.id === dish.id);
      const status =
        dish.archivedReason && dish.archived
          ? "עותק כפול שהועבר לארכיון"
          : section.hidden
            ? "מוסתר מהתפריט"
            : dish.archived
              ? "בארכיון"
              : "מוצג בתפריט";
      html += `<article class="item-row" data-id="${esc(dish.id)}">${dish.photo ? `<img class="item-thumb" src="${esc(dish.photo)}" alt="" loading="lazy">` : '<div class="item-thumb no-photo" aria-hidden="true">B</div>'}<div class="item-info"><div class="item-name">${esc(dish.name)}</div><div class="item-meta">${status}</div></div><div class="item-price">${esc(dish.price) || "—"}</div><div class="row-actions">${dish.archived ? `<button class="btn small" data-action="restore">שחזור</button><button class="icon-btn danger" data-action="delete" aria-label="מחיקה לצמיתות: ${esc(dish.name)}">×</button>` : `<button class="icon-btn" data-action="up" aria-label="העלאת ${esc(dish.name)}" ${index === 0 ? "disabled" : ""}>↑</button><button class="icon-btn" data-action="down" aria-label="הורדת ${esc(dish.name)}" ${index === allMembers.length - 1 ? "disabled" : ""}>↓</button>`}<button class="btn small" data-action="edit" aria-label="עריכת ${esc(dish.name)}">עריכה</button></div></article>`;
    }
  }
  $("#itemList").innerHTML =
    html ||
    `<div class="empty-state"><h3>${search || category !== "all" ? "לא נמצאו פריטים" : tab === "archive" ? "הארכיון ריק" : "התפריט מוכן לפריט הראשון"}</h3><p>${search || category !== "all" ? "נסו חיפוש אחר או בחרו קטגוריה אחרת." : "הוסיפו קטגוריה ופריטים כדי להרכיב את התפריט."}</p></div>`;
}

function renderSections() {
  $("#sectionList").innerHTML =
    ordered(state.sections)
      .map((section, index, sections) => {
        const count = state.dishes.filter(
          (d) => d.section === section.key && !d.archived,
        ).length;
        return `<article class="item-row section-row" data-key="${esc(section.key)}"><span class="section-number">${String(index + 1).padStart(2, "0")}</span><div class="item-info"><div class="item-name">${esc(section.title)}<span class="status ${section.hidden || !count ? "hidden-status" : ""}">${section.hidden ? "מוסתרת" : count ? "מוצגת בתפריט" : "ריקה"}</span></div><div class="item-meta">${count} פריטים פעילים</div></div><div class="row-actions"><button class="icon-btn" data-action="up" aria-label="העלאת ${esc(section.title)}" ${index === 0 ? "disabled" : ""}>↑</button><button class="icon-btn" data-action="down" aria-label="הורדת ${esc(section.title)}" ${index === sections.length - 1 ? "disabled" : ""}>↓</button><button class="btn small" data-action="items">פריטים</button><button class="btn small" data-action="edit">עריכה</button></div></article>`;
      })
      .join("") ||
    '<div class="empty-state">הוסיפו קטגוריה ראשונה כדי להתחיל.</div>';
}

function renderStats() {
  const active = state.dishes.filter((d) => !d.archived);
  const metrics = [
    [active.length, "פריטים פעילים"],
    [state.sections.length, "קטגוריות"],
    [
      active.length
        ? Math.round(
            (active.filter((d) => d.photo).length / active.length) * 100,
          ) + "%"
        : "0%",
      "פריטים עם תמונה",
    ],
    [visits ?? "—", store.isPreview ? "כניסות · אתר מקומי" : "כניסות לתפריט"],
  ];
  $("#statsGrid").innerHTML = metrics
    .map(
      ([value, label]) =>
        `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`,
    )
    .join("");
}

function switchTab(next) {
  tab = next;
  $("#searchInput").value = "";
  $("#categoryFilter").value = "all";
  render();
}
$$("[data-tab]").forEach((button) =>
  button.addEventListener("click", () => {
    if (!busy) switchTab(button.dataset.tab);
  }),
);
$("#searchInput").addEventListener("input", renderItems);
$("#categoryFilter").addEventListener("change", renderItems);

async function perform(action, success, errorTarget) {
  if (busy) return false;
  busy = true;
  const enabled = $$("button:not(:disabled)");
  enabled.forEach((b) => {
    b.disabled = true;
  });
  if (errorTarget) errorTarget.textContent = "";
  try {
    state = await action();
    render();
    $("#pageError").hidden = true;
    if (success) toast(success);
    return true;
  } catch (error) {
    if (errorTarget) errorTarget.textContent = errorMessage(error);
    else pageError(error);
    return false;
  } finally {
    busy = false;
    enabled
      .filter((b) => b.isConnected)
      .forEach((b) => {
        b.disabled = false;
      });
    $("#addDishBtn").disabled = !state.sections.length;
  }
}

function updatePhoto() {
  $("#photoPreview").hidden = !draft.photo;
  $("#photoPreview").src = draft.photo || "";
  $("#removePhotoBtn").hidden = !draft.photo;
}
function editDish(id) {
  if (busy) return;
  const existing = state.dishes.find((d) => d.id === id);
  const selected = $("#categoryFilter").value;
  draft = existing
    ? clone(existing)
    : {
        id: crypto.randomUUID(),
        name: "",
        price: "",
        desc: "",
        note: "",
        photo: "",
        section: selected !== "all" ? selected : state.sections[0]?.key,
        archived: false,
      };
  dishForm.reset();
  field("section").innerHTML = options(draft.section);
  for (const name of ["name", "price", "desc", "note"])
    field(name).value = draft[name] || "";
  for (const [name, type] of [
    ["isVegetarian", "vegetarian"],
    ["isSpicy", "spicy"],
    ["isGlutenFree", "glutenfree"],
  ])
    field(name).checked = dietaryFlag(draft, type);
  $("#dishDialogTitle").textContent = existing ? "עריכת פריט" : "פריט חדש";
  $("#archiveDishBtn").hidden = !existing || !!existing.archived;
  $("#extraFields").open = false;
  $("#dishError").textContent = "";
  $("#photoStatus").textContent = "";
  updatePhoto();
  dirty = false;
  $("#dishDialog").showModal();
  field("name").focus();
}
$("#addDishBtn").addEventListener("click", () => editDish());
dishForm.addEventListener("input", () => {
  dirty = true;
});
function closeDish() {
  if (busy || photoBusy) return;
  if (dirty && !confirm("לסגור בלי לשמור את השינויים?")) return;
  dirty = false;
  $("#dishDialog").close();
}
$$(".close-editor").forEach((b) => b.addEventListener("click", closeDish));
$("#dishDialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  closeDish();
});
$("#removePhotoBtn").addEventListener("click", () => {
  draft.photo = "";
  dirty = true;
  updatePhoto();
});
$("#photoInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  photoBusy = true;
  $("#saveDishBtn").disabled = true;
  $("#photoStatus").textContent = "מכין תמונה…";
  try {
    draft.photo = await store.preparePhoto(file);
    dirty = true;
    updatePhoto();
    $("#photoStatus").textContent = "התמונה תישמר יחד עם הפריט";
  } catch (error) {
    $("#dishError").textContent = errorMessage(error);
    $("#photoStatus").textContent = "";
  } finally {
    photoBusy = false;
    $("#saveDishBtn").disabled = false;
  }
});
dishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || photoBusy) return;
  const values = {};
  for (const name of ["name", "price", "desc", "note", "section"])
    values[name] = field(name).value.trim();
  for (const name of ["isVegetarian", "isSpicy", "isGlutenFree"])
    values[name] = field(name).checked;
  if (!values.name) {
    $("#dishError").textContent = "יש להזין שם לפריט";
    return;
  }
  const success = await perform(
    async () => {
      draft.photo = await store.persistPhoto(draft.id, draft.photo || "");
      return store.saveDish(draft.id, { ...values, photo: draft.photo });
    },
    "הפריט נשמר",
    $("#dishError"),
  );
  if (success) {
    dirty = false;
    $("#dishDialog").close();
  }
});
$("#archiveDishBtn").addEventListener("click", async () => {
  if (dirty && !confirm("להעביר לארכיון בלי לשמור את השינויים בטופס?")) return;
  if (
    await perform(
      () => store.setArchived(draft.id, true),
      "הפריט הועבר לארכיון",
      $("#dishError"),
    )
  ) {
    dirty = false;
    $("#dishDialog").close();
  }
});
$("#itemList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || busy) return;
  const id = button.closest("[data-id]").dataset.id,
    action = button.dataset.action;
  if (action === "edit") editDish(id);
  if (action === "up" || action === "down")
    await perform(
      () => store.reorder("dishes", id, action === "up" ? -1 : 1),
      "סדר הפריטים עודכן",
    );
  if (action === "restore") {
    const item = state.dishes.find((d) => d.id === id);
    if (
      item.duplicateOf &&
      !confirm(
        "זהו עותק כפול. השחזור עשוי להציג שוב שני פריטים זהים בתפריט. לשחזר?",
      )
    )
      return;
    await perform(() => store.setArchived(id, false), "הפריט שוחזר לתפריט");
  }
  if (
    action === "delete" &&
    confirm("למחוק את הפריט לצמיתות? לא ניתן לבטל פעולה זו.")
  )
    await perform(() => store.deleteDish(id), "הפריט נמחק");
});

function editSection(key) {
  const existing = state.sections.find((s) => s.key === key);
  sectionDraft = existing
    ? clone(existing)
    : {
        key: `section-${crypto.randomUUID()}`,
        title: "",
        short: "",
        hidden: false,
      };
  sectionForm.reset();
  sectionField("title").value = sectionDraft.title;
  sectionField("short").value = sectionDraft.short || "";
  sectionField("visible").checked = !sectionDraft.hidden;
  $("#sectionDialogTitle").textContent = existing
    ? "עריכת קטגוריה"
    : "קטגוריה חדשה";
  $("#sectionError").textContent = "";
  $("#removeSectionArea").hidden = !existing;
  $("#removeSectionArea").open = false;
  $("#sectionDestination").innerHTML =
    '<option value="">בחרו קטגוריה</option>' + options("", key);
  const count = state.dishes.filter((d) => d.section === key).length;
  $("#deleteSectionBtn").textContent = count
    ? `מחיקה והעברת ${count} פריטים`
    : "מחיקת הקטגוריה הריקה";
  sectionDirty = false;
  $("#sectionDialog").showModal();
  sectionField("title").focus();
}
$("#addSectionBtn").addEventListener("click", () => editSection());
sectionForm.addEventListener("input", () => {
  sectionDirty = true;
});
function closeSection() {
  if (busy) return;
  if (sectionDirty && !confirm("לסגור בלי לשמור את השינויים?")) return;
  sectionDirty = false;
  $("#sectionDialog").close();
}
$$(".close-section").forEach((b) => b.addEventListener("click", closeSection));
$("#sectionDialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  closeSection();
});
sectionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = {
    title: sectionField("title").value,
    short: sectionField("short").value,
    hidden: !sectionField("visible").checked,
  };
  if (
    await perform(
      () => store.saveSection(sectionDraft.key, values),
      "הקטגוריה נשמרה",
      $("#sectionError"),
    )
  ) {
    sectionDirty = false;
    $("#sectionDialog").close();
  }
});
$("#deleteSectionBtn").addEventListener("click", async () => {
  const destination = $("#sectionDestination").value;
  if (
    state.dishes.some((d) => d.section === sectionDraft.key) &&
    !destination
  ) {
    $("#sectionError").textContent = "בחרו לאן להעביר את הפריטים לפני המחיקה";
    return;
  }
  if (!confirm("למחוק את הקטגוריה? הפריטים יועברו לקטגוריה שנבחרה.")) return;
  if (
    await perform(
      () => store.removeSection(sectionDraft.key, destination),
      "הקטגוריה נמחקה",
      $("#sectionError"),
    )
  ) {
    sectionDirty = false;
    $("#sectionDialog").close();
  }
});
$("#sectionList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || busy) return;
  const key = button.closest("[data-key]").dataset.key,
    action = button.dataset.action;
  if (action === "edit") editSection(key);
  if (action === "items") {
    switchTab("items");
    $("#categoryFilter").value = key;
    renderItems();
  }
  if (action === "up" || action === "down")
    await perform(
      () => store.reorder("sections", key, action === "up" ? -1 : 1),
      "סדר הקטגוריות עודכן",
    );
});

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  if (button.disabled) return;
  button.disabled = true;
  $("#loginError").textContent = "";
  try {
    await store.signIn(
      event.target.elements.email.value.trim(),
      event.target.elements.password.value,
    );
  } catch {
    $("#loginError").textContent = "הכניסה נכשלה. בדקו את הפרטים ונסו שוב.";
  } finally {
    button.disabled = false;
  }
});
$("#logoutBtn").addEventListener("click", async () => {
  try {
    await store.signOut();
  } catch (error) {
    pageError(error);
  }
});
$("#exportBtn").addEventListener("click", async () => {
  const current = await store.loadMenu();
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(current, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "blanco-preview-menu.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("#resetBtn").addEventListener("click", () => {
  if (confirm("לאפס את כל שינויי התצוגה המקומית לעותק המקורי?"))
    perform(store.resetPreview, "העותק המקומי אופס");
});
window.addEventListener("beforeunload", (event) => {
  if (dirty || sectionDirty || busy) {
    event.preventDefault();
    event.returnValue = "";
  }
});
store.subscribe((next) => {
  state = next;
  render();
});
$("#previewBar").hidden = !store.isPreview;
$("#localTools").hidden = !store.isPreview;
$("#logoutBtn").hidden = store.isPreview;
try {
  await store.observeAuth(async (user) => {
    $("#workspace").hidden = !user;
    $("#loginView").hidden = !!user;
    if (!user) {
      dirty = sectionDirty = false;
      $("#dishDialog").close();
      $("#sectionDialog").close();
      state = { sections: [], dishes: [] };
      return;
    }
    try {
      state = store.isPreview
        ? await store.loadMenu()
        : await store.initializeAdmin();
      render();
    } catch (error) {
      $("#loading").hidden = true;
      pageError(error);
    }
    store
      .visitCount()
      .then((count) => {
        visits = count;
        renderStats();
      })
      .catch(() => {
        visits = null;
        renderStats();
      });
  });
} catch (error) {
  $("#workspace").hidden = false;
  $("#loading").hidden = true;
  pageError(error);
}
