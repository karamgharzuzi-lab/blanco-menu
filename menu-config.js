// ════════════════════════════════════════════════════════════════
//  BLANCO — shared config
//  This is the ONLY place you paste your Firebase keys.
//  Both index.html (the menu) and admin.html (the editor) read from here.
//
//  ⚠️ These keys are SAFE to be public — they are NOT a password.
//     Your menu is protected by your admin login + the security rules.
// ════════════════════════════════════════════════════════════════

export const firebaseConfig = {
  apiKey:            "AiZaSyDmZon8jjslscNdu1hjT-iT_sGPsV1AtI8",
  authDomain:        "blan-76d34.firebaseapp.com",
  projectId:         "blan-76d34",
  storageBucket:     "blan-76d34.firebasestorage.app",
  messagingSenderId: "236971012667",
  appId:             "1:236971012667:web:f5baccbe484b44914a21e"
};

// The menu sections, in display order. The 'key' must match the
// data-target on the nav buttons in index.html. To rename a section
// heading, just edit its 'title' below.
export const SECTIONS = [
  { key: "breakfast",  title: "ארוחות בוקר" },
  { key: "salads",     title: "בלאנקו בטבע" },
  { key: "sandwiches", title: "כריכים מפנקים" },
  { key: "mains",      title: "עיקריות בלאנקו" },
  { key: "snacks",     title: "חטיפים" },
  { key: "mezazak",    title: "ע מזאז׳ק" },
  { key: "pasta",      title: "פינה מרומא" },
  { key: "kids",       title: "מנות ילדים" },
  { key: "mezze",      title: "מזות" }
];
