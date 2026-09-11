import { firebaseConfig } from "./menu-config.js";
import {
  clone,
  normalizeState,
  cleanKnownDuplicates,
  sameData,
  saveDishInState,
  saveSectionInState,
  removeSectionInState,
  moveItem,
  CLEANUP_VERSION,
} from "./menu-model.js";

export const isPreview =
  ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) ||
  location.protocol === "file:";
export const PREVIEW_KEY = "blanco-menu-preview-v1";
let firebasePromise;
let previewPromise;
const listeners = new Set();

async function firebase() {
  if (isPreview) throw new Error("Firebase is disabled in local preview.");
  firebasePromise ||= Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js"),
  ]).then(([appModule, fs, authModule, storageModule]) => {
    const app = appModule.initializeApp(firebaseConfig);
    return {
      fs,
      db: fs.getFirestore(app),
      authModule,
      auth: authModule.getAuth(app),
      storageModule,
      storage: storageModule.getStorage(app),
    };
  });
  return firebasePromise;
}

async function readPreview(locked = false) {
  const saved = localStorage.getItem(PREVIEW_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      throw new Error(
        "לא ניתן לקרוא את העותק המקומי. אפשר לאפס אותו דרך הגדרות התצוגה המקומית.",
      );
    }
  }
  if (!locked && navigator.locks)
    return navigator.locks.request(PREVIEW_KEY, () => readPreview(true));
  previewPromise ||= fetch("./.local-preview/menu-snapshot.json")
    .then(async (response) => {
      if (!response.ok)
        throw new Error(
          "העותק המקומי חסר. יש לפתוח את האתר דרך Open Blanco.cmd בתיקיית הפרויקט.",
        );
      const state = normalizeState(await response.json());
      const current = localStorage.getItem(PREVIEW_KEY);
      if (current) return normalizeState(JSON.parse(current));
      cleanKnownDuplicates(state);
      writePreview(state);
      return state;
    })
    .finally(() => {
      previewPromise = undefined;
    });
  return clone(await previewPromise);
}

function writePreview(state) {
  try {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(state));
  } catch {
    throw new Error(
      "אין מספיק מקום לשמירה בדפדפן. נסו תמונה קטנה יותר או ייצאו גיבוי לפני איפוס התצוגה.",
    );
  }
}

export async function loadMenu() {
  if (isPreview) return readPreview();
  const { fs, db } = await firebase();
  const [dishes, settings] = await Promise.all([
    fs.getDocs(fs.collection(db, "dishes")),
    fs.getDoc(fs.doc(db, "menuSettings", "config")),
  ]);
  const state = normalizeState({
    ...settings.data(),
    dishes: dishes.docs.map((d) => ({ ...d.data(), id: d.id })),
  });
  // Customer reads can conceal the audited copies before the first admin migration.
  cleanKnownDuplicates(state);
  return state;
}

async function mutate(change) {
  let result;
  if (isPreview) {
    const update = async () => {
      const state = await readPreview(true);
      change(state);
      state.revision++;
      writePreview(state);
      return state;
    };
    result = navigator.locks
      ? await navigator.locks.request(PREVIEW_KEY, update)
      : await update();
  } else {
    const { fs, db, auth } = await firebase();
    if (!auth.currentUser) throw new Error("יש להתחבר כדי לשמור שינויים");
    result = await fs.runTransaction(db, async (transaction) => {
      // Every editor mutation writes this shared revision. Concurrent menu edits retry.
      const configRef = fs.doc(db, "menuSettings", "config");
      const config = await transaction.get(configRef);
      const listed = await fs.getDocs(fs.collection(db, "dishes"));
      const docs = await Promise.all(
        listed.docs.map((d) => transaction.get(d.ref)),
      );
      const before = docs
        .filter((d) => d.exists())
        .map((d) => ({ ...d.data(), id: d.id }));
      const state = normalizeState({ ...config.data(), dishes: before });
      const backups = cleanKnownDuplicates(state);
      change(state);
      for (const dish of state.dishes) {
        const previous = before.find((d) => d.id === dish.id);
        if (!sameData(previous, dish)) {
          const { id, ...fields } = dish;
          transaction.set(fs.doc(db, "dishes", id), fields);
        }
      }
      before
        .filter((d) => !state.dishes.some((next) => next.id === d.id))
        .forEach((d) => transaction.delete(fs.doc(db, "dishes", d.id)));
      const { dishes, ...settings } = state;
      state.revision = settings.revision = (settings.revision || 0) + 1;
      transaction.set(configRef, settings);
      if (backups.length)
        transaction.set(fs.doc(db, "menuBackups", CLEANUP_VERSION), {
          dishes: backups,
          archivedAt: fs.serverTimestamp(),
        });
      return state;
    });
  }
  listeners.forEach((listener) => listener(result));
  return result;
}

export const initializeAdmin = () => mutate(() => {});
export const saveDish = (id, values) =>
  mutate((state) => saveDishInState(state, id, values));
export const saveSection = (key, values) =>
  mutate((state) => saveSectionInState(state, key, values));
export const removeSection = (key, destination) =>
  mutate((state) => removeSectionInState(state, key, destination));
export const reorder = (kind, id, step) =>
  mutate((state) => moveItem(state, kind, id, step));
export const setArchived = (id, archived) =>
  mutate((state) => {
    const dish = state.dishes.find((d) => d.id === id);
    if (!dish) throw new Error("הפריט כבר אינו קיים");
    dish.archived = archived;
  });
export const deleteDish = (id) =>
  mutate((state) => {
    state.dishes = state.dishes.filter((d) => d.id !== id);
  });

export async function observeAuth(callback) {
  if (isPreview) {
    callback({ preview: true });
    return () => {};
  }
  const { authModule, auth } = await firebase();
  return authModule.onAuthStateChanged(auth, callback);
}
export async function signIn(email, password) {
  const { authModule, auth } = await firebase();
  return authModule.signInWithEmailAndPassword(auth, email, password);
}
export async function signOut() {
  if (isPreview) return;
  const { authModule, auth } = await firebase();
  return authModule.signOut(auth);
}
export async function visitCount() {
  if (isPreview) return null;
  const { fs, db } = await firebase();
  return (await fs.getCountFromServer(fs.collection(db, "visits"))).data()
    .count;
}
export async function trackVisit() {
  if (isPreview) return;
  const { fs, db } = await firebase();
  await fs.addDoc(fs.collection(db, "visits"), {
    openedAt: fs.serverTimestamp(),
  });
}
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
window.addEventListener("storage", (event) => {
  if (isPreview && event.key === PREVIEW_KEY)
    loadMenu()
      .then((state) => listeners.forEach((listener) => listener(state)))
      .catch(console.error);
});
export async function resetPreview() {
  if (!isPreview) return;
  const reset = async () => {
    localStorage.removeItem(PREVIEW_KEY);
    return readPreview(true);
  };
  const state = navigator.locks
    ? await navigator.locks.request(PREVIEW_KEY, reset)
    : await reset();
  listeners.forEach((listener) => listener(state));
  return state;
}

export async function preparePhoto(file) {
  if (!file.type.startsWith("image/")) throw new Error("יש לבחור קובץ תמונה");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("התמונה גדולה מדי. הגודל המרבי הוא 15MB");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
export async function persistPhoto(id, photo) {
  if (isPreview || !photo.startsWith("data:")) return photo;
  const { storageModule, storage } = await firebase();
  const blob = await (await fetch(photo)).blob();
  const target = storageModule.ref(
    storage,
    `dishes/${id}/${crypto.randomUUID()}.jpg`,
  );
  await storageModule.uploadBytes(target, blob);
  return storageModule.getDownloadURL(target);
}
