// ════════════════════════════════════════════════════════════════
//  BLANCO — shared config
//  This is the ONLY place you paste your Firebase keys.
//  Both index.html (the menu) and admin.html (the editor) read from here.
// ════════════════════════════════════════════════════════════════

export const firebaseConfig = {
  apiKey:            "AIzaSyDmZon8jjslscNdu1hjT-iT_sGPsV1AtI8",
  authDomain:        "blan-76d34.firebaseapp.com",
  projectId:         "blan-76d34",
  storageBucket:     "blan-76d34.firebasestorage.app",
  messagingSenderId: "236971012667",
  appId:             "1:236971012667:web:f5baccbfe484b44914a21e"
};

// Legacy section defaults used only until the admin saves the shared
// menuSettings/config document. Manage names, visibility and order in admin.
export const SECTIONS = [
  { key: "breakfast",  title: "ארוחות בוקר", short: "ארוחות בוקר" },
  { key: "salads",     title: "בלאנקו בטבע", short: "בטבע" },
  { key: "sandwiches", title: "כריכים מפנקים", short: "כריכים" },
  { key: "mains",      title: "עיקריות בלאנקו", short: "עיקריות" },
  { key: "snacks",     title: "חטיפים", short: "חטיפים" },
  { key: "mezazak",    title: "מזאז׳ק", short: "מזאז׳ק" }, // Fixed stray "ע" typo from the original database headings
  { key: "pasta",      title: "פינה מרומא", short: "פינה מרומא" },
  { key: "kids",       title: "מנות ילדים", short: "ילדים" },
  { key: "mezze",      title: "מזות", short: "מזות" },
  { key: "drinks",     title: "שתייה", short: "שתייה" },
  { key: "alcohol",    title: "שתייה חריפה", short: "חריף" }
];
