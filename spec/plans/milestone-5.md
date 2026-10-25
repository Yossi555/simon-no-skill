# תוכנית – Milestone 5: PWA, Offline ופרסום ב-GitHub Pages

מקורות: `spec/MILESTONES.md` (Milestone 5), `spec/PRD.md` (§4.5, Edge Cases, הנחות), `spec/ARCHITECTURE.md` (§2.7, §2.8, §2.9, ADR-8, ADR-9), `spec/DESIGN.md` (§2.4 App Icon, §2.1 צבעים). אין יכולות מעבר למסמכים. מצב ההתחלה: M1–M4 הושלמו; Workflow הפריסה קיים ועובר; הריפו `Yossi555/simon-no-skill` **ציבורי** (נבדק ב-API של GitHub).

## 0. גבולות ה-Milestone
**בפנים:** אייקון האפליקציה (SVG מקור + PNG), `vite-plugin-pwa` עם Manifest ו-Workbox `generateSW`, Precache מלא (HTML/JS/CSS/גופן/אייקונים), טיפול בעדכון גרסה ללא Reload כפוי, וידוא ה-Workflow, בדיקות ובדיקה ידנית של Build פרוס (כולל Offline).
**מחוץ:** אין Background Sync, Push, Cache דינמי, מסך שלישי, הגדרות או יכולות חדשות.

## 1. שינויים בקבצים
```
public/icon.svg                  – חדש: מקור האייקון – לוח Simon עגול (ירוק↖ אדום↗ צהוב↙ כחול↘), מרכז Charcoal, רקע #0A1628, ללא טקסט
public/pwa-64x64.png, pwa-192x192.png, pwa-512x512.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png, favicon.ico
                                 – נוצרים מה-SVG ע"י @vite-pwa/assets-generator ונשמרים בריפו
pwa-assets.config.ts             – חדש: preset minimal-2023, רקע Maskable/Apple = #0A1628
package.json                     – devDependencies: vite-plugin-pwa, @vite-pwa/assets-generator; סקריפט "icons"
vite.config.ts                   – VitePWA(...) (ראה §2); base נשאר '/simon-no-skill/' (ADR-8)
index.html                       – <link rel="icon">, apple-touch-icon (נתיבים יחסיים ל-base)
src/pwa/manifest.test.ts         – חדש: בדיקת הגדרות ה-Manifest/Workbox (id, scope, start_url, lang/dir, אייקונים, registerType)
.github/workflows/deploy.yml     – ללא שינוי מהותי (כבר: npm ci → typecheck → test → build → Pages); וידוא בלבד
```

## 2. הגדרת PWA (ARCHITECTURE §2.7, ADR-9)
- **Manifest:** `id: '/simon-no-skill/app'` (ADR-9 – לא לשנות), `name`/`short_name: 'Disco Go'`, `description` בעברית, `lang: 'he'`, `dir: 'rtl'`, `display: 'standalone'`, `orientation: 'portrait'`, `start_url` ו-`scope` = `'/simon-no-skill/'` (נגזרים מקבוע ה-base), `theme_color`/`background_color: '#0A1628'`, אייקונים 192, 512 ו-512 Maskable (`purpose: 'maskable'`).
- **Workbox `generateSW`:** `globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']` – כולל קובצי Heebo 400/600/700 מ-`@fontsource`; `navigateFallback: 'index.html'` בתוך ה-Scope בלבד; `cleanupOutdatedCaches: true`. אין `runtimeCaching`. הצלילים הם Web Audio (Oscillators) ולכן אין קובצי אודיו ל-Cache.
- **עדכונים:** `registerType: 'prompt'` (לא `autoUpdate`), ללא `skipWaiting`/`clientsClaim`. Service Worker חדש נכנס למצב Waiting ואינו מחליף את הישן ואינו מרענן את הדף – הוא מופעל רק בפתיחה הבאה של האפליקציה (כשכל הלשוניות/החלונות נסגרו). כך משחק פעיל לעולם לא נקטע.
- **רישום ה-SW:** `injectRegister: 'auto'` – סקריפט רישום קטן נוצר ב-Build; אין שינוי בקוד React ואין השפעה על בדיקות jsdom.

## 3. נקודה פתוחה לאישור – בקשת עדכון בממשק
ARCHITECTURE §2.7 מתיר ("ניתן") להציג בקשת עדכון בעברית כשאין משחק פעיל, אך DESIGN אינו מגדיר רכיב כזה.
- **ברירת המחדל שלי (מומלץ):** ללא רכיב UI – העדכון מוחל בשקט בפתיחה הבאה (§2). אין רכיב חדש שלא מופיע בעיצוב.
- **חלופה:** פס קטן בעברית "גרסה חדשה זמינה" + כפתור "עדכן", מוצג רק במצב `idle` (לא במשחק פעיל/מושהה); לחיצה → `updateSW(true)` ורענון.

## 4. בדיקות
- **אוטומטיות:** כל הבדיקות הקיימות (Regression: עשרת השלבים, כישלון ראשון, קונפטי בניצחון בלבד, השהיה/חידוש, עשר תוצאות, מחיקה מאושרת) + `manifest.test.ts`.
- **Build מקומי (`npm run build` + `vite preview`):** קיום `manifest.webmanifest`, `sw.js`, `registerSW.js` ב-`dist/`; ה-Precache כולל את הגופנים והאייקונים; ב-Browser Pane – SW במצב activated, ואז עצירת שרת ה-preview וטעינה מחדש = סימולציית Offline: שני המסכים, משחק, היסטוריה.
- **Build פרוס (HTTPS):** האתר נטען בלי 404 תחת `/simon-no-skill/`, Manifest ו-SW תקינים.
- **בדיקה במכשיר (על ידך):** התקנה בטלפון, צלילים ומגע, מצב טיסה → פתיחה מחדש ומשחק. לא אציג בדיקה שלא בוצעה כאילו עברה.

## 5. Definition of Done – תוצאות (נבנה בפועל)
נבנה כמתוכנן, עם החלטת המשתמש: **ללא רכיב UI לעדכון** – SW חדש ממתין ונכנס לתוקף בפתיחה הבאה. סטייה קטנה: הגדרות ה-PWA נמצאות ב-`src/pwa/pwaOptions.ts` (ולא ישירות ב-`vite.config.ts`) כדי שהבדיקה `src/pwa/pwaOptions.test.ts` תוכל לייבא אותן. נוספה תצורת `preview` ל-`.claude/launch.json` (פורט 4173) לבדיקת ה-Build. 76 בדיקות עוברות (71 קודמות + 5 ל-PWA); `typecheck` ו-`build` מצליחים; ה-Precache כולל 27 קבצים (HTML, JS, CSS, 12 קובצי woff2 של Heebo, אייקונים, Manifest); `builds/milestone-5.zip` נוצר.

| # | קריטריון | סטטוס |
|---|---|---|
| 1 | Workflow עובר ומפרסם אוטומטית לאחר Push | יעודכן אחרי ה-Push |
| 2 | HTTPS תחת נתיב הפרויקט ללא 404 | יעודכן אחרי ה-Push |
| 3 | Manifest ו-SW תקינים, אפשרות התקנה | **עובר (מקומית)** – `manifest.webmanifest` עם id/scope/start_url תחת `/simon-no-skill/`, `he`/`rtl`, אייקונים 192/512/Maskable; SW במצב `activated` ושולט בדף. התקנה במכשיר – לבדיקת המשתמש |
| 4 | Offline אחרי Precache: פתיחה, משחק, צלילים, ניווט, היסטוריה | **עובר (סימולציה מקומית)** – שרת ה-preview נעצר (בקשה לשרת נכשלה), הדף נטען מחדש מה-Cache עם הגופן Heebo, שוחק משחק עד הפסד, ניווט ל"אודות" והרשומה הוצגה. הצלילים הם Web Audio ללא קבצים; שמיעה בפועל – לבדיקה במכשיר |
| 5 | עדכון גרסה לא מרענן משחק פעיל | **עובר (בתצורה)** – `registerType: 'prompt'` ללא `skipWaiting`/`clientsClaim` (נבדק בבדיקה אוטומטית); אין קוד שמפעיל Reload. החלפת גרסה בפועל – תיבדק אחרי Push |
| 6 | Regression + Smartphone אנכי עברית/RTL | **עובר** – כל בדיקות ה-Regression (עשרת השלבים, כישלון ראשון, קונפטי בניצחון בלבד, השהיה/חידוש, עשר תוצאות, מחיקה מאושרת); Viewport 375×812: `dir=rtl`, ללא גלילה אופקית |

**מגבלות:** לא נבדק במכשיר פיזי (התקנה, מגע, צלילים, מצב טיסה).
