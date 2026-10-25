# תוכנית – Milestone 1: בסיס אפליקציה ושני מסכים מעוצבים

מקורות: `spec/MILESTONES.md` (Milestone 1), `spec/DESIGN.md`, `spec/ARCHITECTURE.md` (ADR-1, ADR-8). אין יכולות מעבר למסמכים.

## 1. הקמת הפרויקט
- Vite + React + TypeScript (ידנית, בשורש הריפו; ללא תבנית שמוסיפה קבצים מיותרים).
- תלויות: `react`, `react-dom`, `@fontsource/heebo` (משקלים 400/600/700). פיתוח: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- `vite.config.ts`: `base: "/simon-no-skill/"` (גם dev), הגדרות Vitest (jsdom).
- סקריפטים: `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`), `typecheck`.
- `index.html`: `lang="he"`, `dir="rtl"`, viewport למובייל, `<title>` "דיסקו גו". `.gitignore` (node_modules, dist), lockfile נכלל.
- תיקיית `placeholder/` מהקמה: נמחקת, ה-Workflow מתעדכן.

## 2. מבנה קוד
```
src/
  main.tsx            – כניסה, ייבוא גופן ו-CSS
  App.tsx             – App Shell: מצב מסך (home|about) ב-useState, ניווט ללא טעינת דף
  game/colors.ts      – הגדרת 4 הצבעים + grid-area + שם נגיש בעברית
  components/
    Board.tsx         – לוח Simon: מיכל grid 2×2, direction: ltr, 4 כפתורי button, דיסק מרכזי (ADR-1)
    NavBar.tsx        – פס ניווט תחתון "בית"/"אודות" (aria-current לפעיל)
  screens/
    HomeScreen.tsx    – כותרת "דיסקו גו", "שלב 1 מתוך 10", לוח, כפתור "התחל משחק"
    AboutScreen.tsx   – כותרת "אודות", כרטיס "על המשחק", "10 המשחקים האחרונים", חיווי ריק
  styles/             – CSS רגיל + משתני CSS (צבעים, ריווח 8/12/16/24, טיפוגרפיה)
```
- סידור הלוח: ירוק למעלה-שמאל, אדום למעלה-ימין, צהוב למטה-שמאל, כחול למטה-ימין (Mockups גובר).
- ב-Milestone זה הלוח והכפתור **אינם מריצים משחק** (כפתורי הרבעים ללא פעולה; "התחל משחק" ללא פעולה). אין reducer, אודיו, היסטוריה, Dialog, קונפטי, PWA.
- ה-State של האפליקציה יושב ב-`App` (המסכים מוחלפים, לא Router) – בהתאם לארכיטקטורה, כדי שבהמשך המשחק לא יתפרק במעבר.
- מסך אודות: טקסט הוראות קצר בעברית (זכור את הרצף, לחץ לפי הסדר, טעות אחת מסיימת, 10 שלבים לניצחון) וחיווי "עדיין אין משחקים שמורים". ללא כפתור "מחק היסטוריה" (מוצג רק כשיש רשומות – M4).

## 3. עיצוב
- Theme כהה: Background `#0A1628`, Surface `#12213A`, Border `#1E3556`, צבעי הלוח לפי DESIGN §2.1, Charcoal למסגרת/מרכז.
- Heebo עם Fallback `Arial, sans-serif`; גדלי כותרות/גוף/כפתור לפי §2.2.
- Mobile-First: עמוד בגובה `100dvh`, רוחב מרבי ~480px ממורכז בדסקטופ, ללא גלילה אופקית, אזור תוכן גולל אם צריך, פס ניווט קבוע בתחתית (כולל safe-area).
- כפתור ראשי כחול עגול עם צל; ללא Glow משחקי (לא נדרש כאן), כפתורי רבעים עם `:active` עדין בלבד – ללא הוספת התנהגות משחק.
- כל הטקסטים בעברית; ללא אייקוני הגדרות/סאונד.

## 4. בדיקות (Vitest + RTL)
- `App` מרנדר בית: כותרת, "שלב 1 מתוך 10", "התחל משחק", 4 רבעים עם שמות נגישים.
- ניווט לאודות ובחזרה ללא רענון דף; אין מסך שלישי (שני פריטי ניווט בלבד).
- אודות מציג "על המשחק" ו-חיווי היסטוריה ריקה; אין כפתור "מחק היסטוריה".
- בדיקת מיקום הרבעים (grid-area לפי `colors.ts`) ו-`lang`/`dir` ב-HTML.

## 5. CI ו-Build
- עדכון `.github/workflows/deploy.yml`: `setup-node` (Node 22 LTS) → `npm ci` → `typecheck` → `test` → `build` → העלאת `dist/` → פריסה ל-Pages.
- בסוף: `npm run build` ו-`builds/milestone-1.zip` מתוכן `dist/` (נכלל בריפו).

## 6. סדר ביצוע
1. הקמת פרויקט ותלויות → 2. מבנה, CSS ומסכים → 3. בדיקות → 4. typecheck/test/build → 5. הרצה מקומית `http://localhost:5173/simon-no-skill/` לבדיקת המשתמש → 6. אחרי אישור: קומיט, Push ל-`main`, וידוא Workflow, לינק חי: https://yossi555.github.io/simon-no-skill/

## 7. Definition of Done – תוצאות (נבנה בפועל)
נבנה כמתוכנן: Vite+React+TS, `Board`/`NavBar`, `HomeScreen`/`AboutScreen`, CSS יחיד (`src/styles/app.css`), 4 בדיקות ב-`src/App.test.tsx`, Workflow מעודכן (`npm ci` → typecheck → test → build → deploy `dist/`), `builds/milestone-1.zip`, ו-`.claude/launch.json` לשרת הפיתוח.
- [x] **עובר** – `npm run build` ו-typecheck מצליחים; 4/4 בדיקות עוברות.
- [x] **עובר** – שני המסכים נפתחים, מעבר ללא רענון (נבדק בדפדפן), שני פריטי ניווט בלבד.
- [x] **עובר** – ארבעת הרבעים במיקום הנכון (נבדק ויזואלית ובבדיקה), "שלב 1 מתוך 10", "התחל משחק"; באודות הסבר וחיווי ריק.
- [x] **עובר** – עברית ו-RTL; אין גלילה אופקית ב-375×812 בשני המסכים (נבדק בדפדפן באמולציה). לא נבדק במכשיר פיזי.
- [x] **עובר** – אין יכולות מעבר ל-PRD, אין Backend/Database.
- ⏳ Workflow ב-GitHub Actions: יאומת לאחר ה-Push.

## 8. נקודות לתשומת לב
- ב-Mockups הכותרת "סיימון" ואיורי "שחק שוב"/"התחלה" הם מגבלות המחשה; מממשים לפי הטקסטים בטקסט של DESIGN ("דיסקו גו", "התחל משחק").
- ההנחה שה-Pages כבר מוגדר ל-Source: GitHub Actions (נעשה בהקמה).
