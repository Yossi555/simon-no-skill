# CLAUDE.md – דיסקו גו (משחק Simon)

## מקורות אמת
- כל מסמכי הספק בתיקייה `spec/`: `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `MILESTONES.md`, `wireframes.png`, `mockups.png`, `style-guide.png`.
- יש לקרוא את המסמכים הרלוונטיים לפני כל מיילסטון. אין להוסיף יכולות שאינן במסמכים.

## שפה ותקשורת
- האפליקציה בעברית מלאה, `lang="he"`, `dir="rtl"`.
- מול המשתמש: לכתוב בעברית, ולהנחות צעד אחר צעד מהו השלב הבא – ענייני, קצר וברור.
- לפני ששואלים שאלות: לקרוא קודם את הקבצים, ורק אז לחדד מול המשתמש נקודות פתוחות.

## מודל מומלץ
- Opus: שלב ההקמה, Milestone 2 (מנוע משחק, טיימרים, אודיו), Milestone 3 (השהיה/ביטול).
- Sonnet: Milestone 1 (UI), Milestone 4 (היסטוריה), Milestone 5 (PWA/CI).

## עבודה לפי מיילסטונים
- סדר העבודה לפי `spec/MILESTONES.md`. כל מיילסטון בשיחה נפרדת בשם `milestone-N` (באותה תיקייה).
- לכל מיילסטון ארבעה שלבים:
  1. **תכנון** – תוכנית בקובץ `spec/plans/milestone-N.md`, ואישור המשתמש.
  2. **בנייה** – מימוש + בדיקות; עדכון `spec/plans/milestone-N.md` במה שנבנה בפועל ובתוצאות ה-Definition of Done (עובר/נכשל).
  3. **הרצה** – הרצה מקומית (`npm run dev`) כדי שהמשתמש יוכל לבדוק, עם הכתובת המקומית.
  4. **דחיפה** – קומיט ו-Push ל-`main`; וידוא שה-Workflow עבר, ומסירת הלינק החי.
- בסוף כל מיילסטון: `npm run build` ויצירת `builds/milestone-N.zip` מתוכן `dist/` (נכלל בריפו).
- אין להתחיל מיילסטון הבא ללא אישור מפורש של המשתמש.
- בסוף כל שלב: לספק את הלינק החי.

## Git ו-GitHub
- משתמש GitHub: `Yossi555`. ריפו: `https://github.com/Yossi555/simon-no-skill` (ציבורי), ענף `main`.
- הגישה ל-Push היא דרך GitHub Desktop / Keychain. לא לבקש סיסמה בצ'אט ולא לשמור Tokens בקוד.
- לינק חי (GitHub Pages, מתעדכן בכל Push ל-`main`): **https://yossi555.github.io/simon-no-skill/**
- Pages מוגדר עם Source: GitHub Actions; ה-Workflow ב-`.github/workflows/deploy.yml`.
- `base: "/simon-no-skill/"` ב-Vite (ראה ARCHITECTURE ADR-8).

## פקודות (מ-Milestone 1)
- `npm run dev` – שרת פיתוח: `http://localhost:5173/simon-no-skill/`
- `npm run build`, `npm run test`, `npm run typecheck`
