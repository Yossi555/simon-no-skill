# תוכנית – Milestone 4: היסטוריית משחקים ומחיקה מאושרת

מקורות: `spec/MILESTONES.md` (Milestone 4), `spec/PRD.md` (תרחישי "סיום משחק" ו"צפייה בהיסטוריה ומחיקתה", §4.4, Edge Cases), `spec/ARCHITECTURE.md` (§2.3 כללים 4, 8–9; §2.5; §2.6 "אודות"; §2.8; ADR-4, ADR-5), `spec/DESIGN.md` (§1.2 מסך אודות, §1.3 Dialog מחיקה, §2.3 History Cards / Dialog / Destructive Button, §2.5). אין יכולות מעבר למסמכים. מצב ההתחלה: M3 הושלם – `won`/`lost` לא מושפעים מניווט או הסתרה, ולכן אפשר לרשום את התוצאה ברגע הכניסה אליהם.

## 0. גבולות ה-Milestone
**בפנים:** History Repository טהור מעל `localStorage` (קריאה + Validation, הוספה עם מגבלת 10, מחיקה, טיפול בכשל), Hook `useHistory` ב-`App`, רישום תוצאה פעם אחת עם Guard לפי `gameId`, רשימת כרטיסי היסטוריה ב"אודות", כפתור "מחק היסטוריה" ו-Dialog אישור, הודעות שגיאה בעברית, בדיקות.
**מחוץ (לא נבנה):** PWA/Offline (M5). אין שמירת מצב משחק פעיל, אין סטטיסטיקות/שיא, אין מחיקת רשומה בודדת.

## 1. שינויים בקבצים
```
src/history/historyStorage.ts   – חדש: מודול טהור (ללא React): types, loadHistory, saveResult, clearHistory, createResult
src/history/useHistory.ts       – חדש: Hook – results + loadError/saveError/deleteError, record(), clear()
src/components/HistoryList.tsx  – חדש: רשימת כרטיסי תוצאות (תאריך ושעה, שלבים שהושלמו, ניצחון/הפסד)
src/components/ConfirmDialog.tsx – חדש: Dialog "למחוק את ההיסטוריה?" עם "ביטול" / "מחק"
src/App.tsx                     – useHistory + Effect רישום בכניסה ל-won/lost עם ref של gameId; prop `getStorage` לבדיקות
src/screens/AboutScreen.tsx     – props: history; רשימה / חיווי ריק / שגיאת טעינה / "מחק היסטוריה" / Dialog / שגיאת מחיקה
src/screens/HomeScreen.tsx      – העברת saveError ל-ResultDialog
src/components/ResultDialog.tsx – prop `saveError` → הודעת כשל שמירה
src/styles/app.css              – .history-card, .history-card__*, .dialog--light, .btn--danger, .btn--secondary
src/test/setup.ts               – localStorage.clear() אחרי כל בדיקה
בדיקות: src/history/historyStorage.test.ts (חדש), src/history/history.test.tsx (חדש, אינטגרציה), App.test.tsx לפי הצורך
```
אין תלויות חדשות. Reducer ו-`useGame` לא משתנים (ARCHITECTURE §2.3 כלל 4: ה-Reducer לא נוגע באחסון).

## 2. History Repository – `historyStorage.ts` (ADR-4, §2.5)
- **Data Model** לפי §2.5: `GameResult = { id, finishedAt (ISO 8601), completedRounds (0–10), outcome: 'win' | 'loss' }`, `HistoryData = { schemaVersion: 1, results }`. מפתח: `simon.history.v1`. (ב-MILESTONES כתוב `won`/`lost`; נשמר הערך מ-§2.5 שבמסמך הארכיטקטורה, והתצוגה היא "ניצחון"/"הפסד".)
- **גישה לאחסון:** כל הפונקציות מקבלות `getStorage: () => Storage` (ברירת מחדל `() => window.localStorage`). גם הגישה ל-`window.localStorage` עצמה וגם `getItem`/`setItem`/`removeItem` עטופות ב-`try/catch` (בדפדפנים מסוימים עצם הגישה זורקת `SecurityError`).
- **`loadHistory(getStorage)`** → `{ results, error }`:
  - מפתח חסר → `[]`, ללא שגיאה.
  - JSON לא ניתן לפענוח / מבנה שגוי / `schemaVersion` אחר / אחסון לא זמין → `[]` + `error: true`.
  - רשומות לא תקינות (id לא מחרוזת, תאריך לא תקין, `completedRounds` לא שלם 0–10, `outcome` לא מוכר) מסוננות בשקט; נשמרות לכל היותר 10 הראשונות.
- **`saveResult(getStorage, current, result)`** → `{ results, ok }`: `[result, ...current].slice(0, 10)` ונכתב כ-`HistoryData`. בכשל כתיבה `ok: false` והרשימה הקודמת חוזרת ללא שינוי (התצוגה משקפת את מה שנשמר בפועל). אחרי JSON פגום, `current` הוא `[]` ולכן השמירה כותבת רשימה תקינה חדשה (ADR-4).
- **`clearHistory(getStorage)`** → `ok`: `removeItem(KEY)`; כשל מוחזר כ-`false` ולא מוסתר.
- **`createResult(outcome, completedRounds, now)`**: `id` מזמן + מספר אקראי (`Date.now().toString(36)` + `Math.random().toString(36)`), לא `crypto.randomUUID` (ADR-4); `finishedAt = now.toISOString()`.

## 3. `useHistory` ורישום התוצאה ב-`App` (ADR-4, §2.3 כלל 8)
- `useHistory(getStorage)` – `useState` עם קריאה ראשונית (קריאה טהורה, בטוחה גם בהרצה כפולה של Strict Mode). מחזיר `results`, `loadError`, `saveError`, `deleteError`, `record(outcome, completedRounds)`, `clear()`.
  - `record` מאפס `saveError` לפני הניסיון ומעדכן אותו לפי התוצאה; בהצלחה גם מאפס `loadError` (האחסון חזר לעבוד).
  - `clear` מחזיר `true`/`false`; בהצלחה `results=[]` ו-`deleteError=false`, בכשל `deleteError=true` והרשימה נשארת על המסך.
- **Effect ב-`App`:** תלוי ב-`state.status` ו-`state.gameId`. אם `status` ∈ {`won`,`lost`} ו-`gameId !== lastRecorded.current` → `lastRecorded.current = gameId` ואז `record(status === 'won' ? 'win' : 'loss', completedRounds)`.
  - ה-`ref` נשמר בין ההרצות הכפולות של Strict Mode, ולכן הרשומה נכתבת פעם אחת.
  - הרישום מתבצע **ברגע הכניסה** ל-`won`/`lost` (ולא אחרי 1000ms של הצגת ההודעה) – מעבר מהיר ל"אודות" כבר מציג את התוצאה.
  - "אישור" (`dismiss`) שומר את `gameId` (ADR-5), ולכן לא מפעיל רישום נוסף; המשחק הבא מקבל `gameId` חדש.
  - `idle`/`presenting`/`awaitingInput`/`paused` לא רושמים כלום; Refresh מאתחל `idle` – אין רישום למשחק שנקטע.
- **הזרקה לבדיקות:** `App` מקבל prop אופציונלי `getStorage` (בדומה ל-`gameDeps`).

## 4. UI (DESIGN §1.2, §1.3, §2.3)
- **"אודות"**: כותרת, כרטיס "על המשחק" (קיים), כותרת "10 המשחקים האחרונים", ואז:
  - יש רשומות → `HistoryList`: `<ol>` של כרטיסים, מהחדש לישן. בכל כרטיס: תאריך ושעה (`Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' })` בזמן המקומי, בתוך `<time dateTime>` עם בידוד כיווניות), "הושלמו X שלבים" / "הושלם שלב אחד" (כמו בהודעת הסיום), ותווית טקסט **"ניצחון"**/**"הפסד"** עם הדגשה מאופקת (לא צבע בלבד).
  - אין רשומות ואין שגיאה → "עדיין אין משחקים שמורים." (קיים).
  - שגיאת טעינה → `role="alert"`: "לא ניתן לטעון את היסטוריית המשחקים. המשחק עצמו זמין כרגיל."
  - **"מחק היסטוריה"** (כפתור משני) – רק כשיש לפחות רשומה אחת.
  - שגיאת מחיקה → `role="alert"`: "לא ניתן היה למחוק את ההיסטוריה. נסו שוב."; הרשימה והכפתור נשארים.
- **`ConfirmDialog`** (Overlay + Scrim, Dialog בהיר לפי ה-Mockup, `role="alertdialog"`): כותרת "למחוק את ההיסטוריה?", הסבר "כל התוצאות השמורות יימחקו, ולא ניתן לשחזר אותן.", כפתורים "ביטול" (משני, `autoFocus`) ו-"מחק" (אדום). "ביטול" סוגר ללא שינוי; "מחק" קורא `clear()` וסוגר את החלונית (בהצלחה – חיווי ריק; בכשל – הודעת השגיאה מעל הרשימה). זו שכבה בתוך מסך "אודות", לא מסך שלישי.
- **הודעת הסיום**: כשהשמירה נכשלה – שורה נוספת `role="alert"`: "לא ניתן היה לשמור את התוצאה בהיסטוריה." הכפתור "אישור" והמשחק ממשיכים לעבוד כרגיל.
- נתוני האחסון מוצגים כטקסט React בלבד (ללא `dangerouslySetInnerHTML`, §2.8).

## 5. בדיקות (Vitest + RTL, Fake Timers)
**historyStorage (יחידה, עם Storage מזויף):** מפתח חסר → `[]` ללא שגיאה; קריאה/כתיבה חוזרת; הוספה בראש הרשימה; 11 הוספות → 10 רשומות מהחדש לישן, הישנה ביותר הוסרה; JSON פגום / `schemaVersion` שגוי → `[]` + שגיאה, והשמירה הבאה כותבת רשימה תקינה; רשומות לא תקינות מסוננות; `getItem`/`setItem`/`removeItem` שזורקים, וגם `getStorage` שזורק → אין קריסה, `ok:false`/`error:true`; `clearHistory` מסיר את המפתח; `id` שונה לשתי רשומות באותה מילישנייה.
**אינטגרציה (App):**
- הפסד בשלב 1 → בדיוק רשומה אחת: "הפסד", "הושלמו 0 שלבים", תאריך ושעה; ניצחון אחרי שלב 10 → רשומה אחת "ניצחון", 10 שלבים.
- מעבר ל"אודות" מיד אחרי הלחיצה השגויה (לפני הודעת ההפסד) → הרשומה כבר מוצגת; "אישור" לא מוסיף רשומה.
- התחלה → השהיה (אודות / `visibilitychange` / `pagehide`) → "המשך משחק" → אין רשומה; unmount באמצע משחק (Refresh) → אין רשומה, והיסטוריה קודמת נשמרת.
- 11 משחקים רצופים → 10 כרטיסים מהחדש לישן; mount חדש עם אותו אחסון (Refresh) → אותן 10 רשומות.
- "מחק היסטוריה" מוצג רק כשיש רשומות; "ביטול" → אין שינוי (באחסון ובתצוגה); "מחק" → האחסון ריק, חיווי ריק, הכפתור נעלם.
- כשל אחסון: כתיבה נכשלת → הודעת שמירה בהודעת הסיום, המשחק הבא מתחיל כרגיל; קריאה נכשלת → הודעה ב"אודות", המשחק זמין; מחיקה נכשלת → הודעה והרשימה נשארת.
- Strict Mode: משחק שהסתיים נרשם פעם אחת (רשומה אחת באחסון, `setItem` נקרא פעם אחת), גם אחרי "אישור" ומשחק נוסף (בדיוק 2).

## 6. ביצוע
1. `historyStorage` + בדיקות יחידה → 2. `useHistory` + Effect הרישום ב-`App` → 3. `HistoryList`, `ConfirmDialog`, `AboutScreen`, `ResultDialog`, CSS → 4. בדיקות אינטגרציה → 5. `typecheck` + `test` + `build` → 6. עדכון סעיף 7 בקובץ זה → 7. `builds/milestone-4.zip` → 8. הרצה מקומית `http://localhost:5173/simon-no-skill/` → 9. **רק אחרי אישור:** קומיט, Push ל-`main` (דרך GitHub Desktop), וידוא Workflow ולינק חי https://yossi555.github.io/simon-no-skill/

## 7. Definition of Done – תוצאות (נבנה בפועל)
נבנה כמתוכנן: `historyStorage.ts` (קריאה + Validation, הוספה עם מגבלת 10, מחיקה, כל גישה עטופה ב-`try/catch`), `useHistory`, Effect רישום ב-`App` עם `ref` של `gameId`, `HistoryList`, `ConfirmDialog` (Dialog בהיר), הודעות שגיאה בעברית ב"אודות" ובהודעת הסיום. Reducer ו-`useGame` לא שונו. סטייה קטנה: הטקסט "הושלמו X שלבים" הועבר לפונקציה משותפת `roundsText` (ב-`HistoryList.tsx`) שמשמשת גם את `ResultDialog`. 66 בדיקות עוברות (47 קודמות + 8 יחידה ל-`historyStorage` + 11 אינטגרציה ב-`history.test.tsx`); `typecheck` ו-`build` מצליחים; `builds/milestone-4.zip` נוצר.
| # | קריטריון | סטטוס |
|---|---|---|
| 1 | ניצחון/הפסד מוסיפים בדיוק רשומה אחת עם זמן סיום, שלבים שהושלמו ו"ניצחון"/"הפסד" | **עובר** – בדיקות (הפסד בשלב 1: "הפסד", 0 שלבים, זמן סיום; ניצחון: "ניצחון", 10 שלבים; רישום מיידי לפני הודעת הסיום, "אישור" לא מוסיף). בדפדפן (Strict Mode): הפסד אחד → רשומה אחת |
| 2 | מעבר מסכים, השהיה, Refresh או יציאה באמצע משחק אינם מוסיפים רשומה | **עובר** – בדיקה: אודות ← בית ← "המשך משחק" ← `pagehide` ← "המשך משחק" ← unmount (Refresh): `setItem` לא נקרא, ההיסטוריה הקודמת נשמרת |
| 3 | אחרי 11 משחקים – לכל היותר 10 רשומות, מהחדש לישן, נשמרות אחרי Refresh | **עובר** – יחידה (11 הוספות → 10, הישנה ביותר הוסרה) ואינטגרציה (11 משחקים → 10 כרטיסים בסדר יורד; mount חדש עם אותו אחסון מציג אותן) |
| 4 | "ביטול" לא משנה נתונים; "מחק" מרוקן ומחזיר חיווי ריק | **עובר** – בדיקות (ביטול: אין `removeItem`, 2 רשומות נשארות; מחק: המפתח הוסר, חיווי ריק, הכפתור נעלם; הכפתור לא מוצג בהיסטוריה ריקה). נבדק גם בדפדפן |
| 5 | כשל אחסון לא מונע משחק, ומוצגת הודעה בעברית בכשל שמירה/מחיקה | **עובר** – בדיקות: כשל כתיבה → הודעה בהודעת הסיום והמשחק הבא מתחיל; כשל קריאה → הודעה ב"אודות"; `localStorage` שעצם הגישה אליו זורקת → אין קריסה; כשל מחיקה → הודעה והרשימה נשארת |
| 6 | בדיקות אוטומטיות: היסטוריה, מגבלת עשר, מחיקה, כשל אחסון, מניעת שמירה כפולה | **עובר** – כולל Strict Mode: שני משחקים → בדיוק 2 רשומות ו-2 קריאות `setItem` |

**מגבלות:** לא נבדק במכשיר פיזי. בדפדפן (Viewport נייד 375×812) נבדקו: רשימת כרטיסים, Dialog המחיקה, מחיקה בפועל, ורישום הפסד אמיתי ב-Strict Mode. מצב אחסון חסום אמיתי (למשל גלישה פרטית) נבדק רק בבדיקות אוטומטיות.
