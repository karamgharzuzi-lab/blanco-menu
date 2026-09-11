# Review Blanco on this PC

Double-click **Open Blanco.cmd** in this folder. It starts the local website and opens the admin editor. Node.js (already installed on this PC) is required.

- Admin: http://127.0.0.1:4173/admin.html
- Customer menu: http://127.0.0.1:4173/index.html

Use the same browser and these exact addresses for both tabs. Preview edits persist in this browser and update the customer menu tab immediately. No login is needed in the local preview. Firebase is never initialized on localhost. Local visits and photo uploads do not contact the production database or storage.

You can create, rename, hide and reorder categories; add, move, reorder, edit and archive items; and restore archived items. Empty categories stay available in the editor and do not appear in the customer menu. Removing a category containing items requires selecting another category to receive all its active and archived items.

The local snapshot has 53 active items and 48 audited duplicate copies archived. Edited originals, two legitimate same-named burgers in separate sections, and all unique additions are preserved. The original public database snapshot and cleanup audit are in `.local-preview/`. They are excluded from Git and deployment.

The Data tab has **Export changes** and **Reset local copy**. Local edits do not automatically become production data; export any menu content changes you want to retain for publication.

## Publication notes

1. Review and save any desired content changes made in the local preview separately; they live in browser storage.
2. Deploy Firebase rules using `firebase deploy --only firestore:rules --project blan-76d34`. The original `admin@blanco.com` restriction is preserved for menu writes, categories and backups. GitHub/Vercel deployment alone does not deploy Firebase rules.
3. On September 11, 2026, the approved production migration archived the 48 unchanged duplicate copies and stored the section configuration. Its recovery backup is in `menuBackups/duplicate-import-2026-09-v1`. The migration marker makes subsequent admin sign-ins safe to repeat.
4. The cleanup compares exact IDs and payloads. Edited copies, missing originals, and unique items are not archived. Restoring a copy afterward is respected because the migration runs once.
5. The old whole-menu import feature has been removed, eliminating the path that created random-ID copies. New items receive one stable ID when their draft opens and are written only on Save.

The static build (`node scripts/build-site.mjs`) copies only the website and images into `dist`. Preview data, helpers and tests are excluded from the published site. Model regression tests run with `node --test tests/menu-model.test.mjs`.
