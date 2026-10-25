# תוכנית – Milestone 2: משחק מלא מקצה לקצה

מקורות: `spec/MILESTONES.md` (Milestone 2), `spec/ARCHITECTURE.md` (§2.3, §2.4, §2.6, §2.10, ADR-2, ADR-5, ADR-10), `spec/DESIGN.md` (§1.1 וטבלת "קצב הצגת הרצף"), `spec/PRD.md`. אין יכולות מעבר למסמכים. מצב ההתחלה: M1 הושלם; `Board` ו-"התחל משחק" עדיין סטטיים, וה-State של המסך ב-`App` (`useState`).

## 0. גבולות ה-Milestone
**בפנים:** מנוע משחק (reducer), `useGame`, Sequence Controller, Audio Engine, לוח אינטראקטיבי, טקסטי סטטוס, חלונית ניצחון/הפסד עם "אישור", קונפטי, הפתרון הזמני למעבר ל"אודות".
**מחוץ (לא נבנה):** מצב `paused` ו-"המשך משחק" (M3), `visibilitychange`/`pagehide` (M3), היסטוריה ו-`localStorage` (M4), PWA (M5). `Action` של `gameId` נוצר כבר עכשיו (נדרש ל-ADR-5 ול-M4), אך אינו נצרך לאחסון.

## 1. מבנה קבצים
```
src/
  game/
    colors.ts          (קיים) + GameColor נשאר מקור יחיד
    timing.ts          – קבועי קצב (ADR-10): LIGHT_MS=600, GAP_MS=250, START_DELAY_MS=1000,
                         ROUND_DONE_MS=1000, NEXT_ROUND_LEAD_MS=1000, RESULT_DELAY_MS=1000,
                         PRESS_MIN_MS=300, MAX_ROUNDS=10
    random.ts          – randomColor(): GameColor (Math.random, אינדקס 0–3). מוחלף ב-mock בבדיקות
    types.ts           – GameState, GameAction, GameStatus
    reducer.ts         – gameReducer + initialGameState (טהור, ללא אודיו/אחסון/רנדום)
    useGame.ts         – Hook: reducer + Effects (הצגה, השהיות, אודיו, תוצאה)
  audio/
    audioEngine.ts     – createAudioEngine(): ניהול AudioContext, צלילים, עצירה
  components/
    Board.tsx          (עדכון) – ארבעה button עם pointerdown, מצבי lit/dim/disabled
    ResultDialog.tsx   – Overlay ניצחון/הפסד + "אישור" + קונפטי
  screens/HomeScreen.tsx  (עדכון) – חיווי שלב, סטטוס, כפתורים לפי מצב
  App.tsx                 (עדכון) – מחזיק useGame; מעבר ל"אודות" (פתרון זמני)
  styles/app.css          (עדכון) – .quadrant--lit/--dim, overlay, הודעת שגיאת אודיו
```
תלות חדשה: `canvas-confetti` + `@types/canvas-confetti` (פיתוח). אין תלויות נוספות.

## 2. Reducer ו-`useGame`

### 2.1 State
```
GameState {
  status: 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost'
  sequence: GameColor[]        // 1–10
  round: number                // 1–10 (במנוחה: 1)
  inputIndex: number
  completedRounds: number      // 0–10
  gameId: number               // עולה בכל start
  presentationId: number       // עולה בכל תחילת הצגה/שינוי מצב; מגן מ-callbacks מיושנים
  resultShown: boolean         // האם הודעת הסיום כבר מוצגת (מתעכבת שנייה)
}
```
זהו תת-קבוצה של המודל ב-ARCHITECTURE §2.5 (בלי `paused`, שמגיע ב-M3).

### 2.2 Actions (ה-Reducer טהור; כל רנדום מגיע בתוך ה-Action – ADR-2)
| Action | תנאי | פעולה |
|---|---|---|
| `start { firstColor }` | `idle` | רצף `[firstColor]`, `round=1`, `completedRounds=0`, `inputIndex=0`, `status=presenting`, `gameId++`, `presentationId++`, `resultShown=false` |
| `presentationDone { presentationId }` | `presenting` + מזהה תואם + שלב לא ממתין למעבר | `status=awaitingInput`, `inputIndex=0` |
| `press { color, nextColor }` | `awaitingInput` בלבד | שגוי: `status=lost` מיד (`completedRounds=round-1`, `resultShown=false`). נכון ולא אחרון: `inputIndex++`. נכון ואחרון בשלב <10: `completedRounds=round`, הרצף מוסיף `nextColor`, `status=presenting`, `presentationId++`, `inputIndex=0` (הקלט נחסם מיד; `round` עדיין הישן). נכון ואחרון בשלב 10: `status=won`, `completedRounds=10` |
| `showNextRound { presentationId }` | `presenting` + מזהה תואם + `completedRounds===round` | `round++` (אין שלב 11 – מוגן גם במפורש) |
| `revealResult { gameId }` | `won`/`lost` + מזהה תואם | `resultShown=true` |
| `dismiss` | `won`/`lost` + `resultShown` | חזרה ל-`initialGameState` תוך שמירת `gameId` ו-`presentationId` (ADR-5) |
| `abandon` | `presenting`/`awaitingInput`, או `won`/`lost` בלי `resultShown` | כמו `dismiss`; `presentationId++`. פתרון זמני – יוסר ב-M3 (ADR-3) |

Action שאינו חוקי למצב הנוכחי מחזיר את אותו State (זהות אובייקט). בדיקת "שלב ממתין למעבר" = `completedRounds === round` בזמן `presenting`.

### 2.3 `useGame` (Effects ו-Timers)
מחזיר `{ state, start, press, release, dismiss, abandon, audioError, litColor }`; מקבל בבדיקות תלויות מוזרקות (`engine`, `randomColor`) עם ברירת מחדל אמיתית.
- **`start()`** (מתוך Gesture של לחיצה): `await engine.unlock()`; בכשל – `audioError` (הודעה בעברית) ו**אין** dispatch (ללא התקדמות שקטה); בהצלחה – `dispatch(start)` עם `randomColor()`.
- **Effect ההצגה** (תלוי ב-`status`, `presentationId`, `round`): ב-`presenting` בלבד. מקרה "ממתין למעבר" (`completedRounds===round`): Timer 1000ms → `showNextRound`. אחרת: Sequence Controller (סעיף 3). Cleanup מבטל Timers, `litColor` ו-`engine.stopAll()`.
- **Effect הסיום** (תלוי ב-`status`, `gameId`): בכניסה ל-`won`/`lost` – Timer 1000ms → `revealResult` ובמקביל הצליל המתאים; Cleanup מבטל. הצליל והקונפטי מתחילים רק ב-reveal (בהפסד: צליל הרבע נשמע מיד בלחיצה עצמה).
- **`press(color)`** מ-`pointerdown`: `engine.startTone(color)` + הארה + `dispatch(press)` עם `nextColor=randomColor()`, רק כש-`status==='awaitingInput'`. **`release`**: כיבוי הארה/צליל אחרי `max(300ms מתחילת הלחיצה, שחרור האצבע)`; השחרור נקלט גם ב-`window` (`pointerup`/`pointercancel`) כי הרבע עלול להפוך ל-`disabled` לפני השחרור. מקלדת (Enter/Space, בלי `repeat`) = לחיצה של 300ms.
- אין הרצת אודיו בתוך ה-Reducer; Strict Mode: כל Effect עם Cleanup מלא, ו-callbacks בודקים `presentationId`/`gameId`.

## 3. Sequence Controller
פונקציה `playSequence(sequence, { engine, setLit, signal })` ב-`useGame` (או `src/game/sequence.ts` אם גדלה): מחכה `START_DELAY_MS`, ואז לכל צבע: הארה + `startTone` למשך `LIGHT_MS`, כיבוי, `GAP_MS` (אחרון: בלי הפסקה אחריו), ולבסוף `presentationDone`. מבוסס `AbortSignal` + `setTimeout` בלבד (ללא Promise שרשור שאי אפשר לבטל): ביטול מנקה Timers מיד ומונע dispatch. אותו קצב בכל השלבים. אחרי `showNextRound` ההצגה מתחילה ב-Effect שמופעל מחדש (שינוי `round`) עם המתנה של 1000ms לפני הצבע הראשון.

רצף זמנים נבדק מול טבלת DESIGN §1.1: התחלה→1000→צבע(600)→250→צבע…; שחזור נכון→1000→מספר שלב חדש→1000→צבע ראשון; לחיצה אחרונה בשלב 10→1000→ניצחון; לחיצה שגויה→1000→הפסד.

## 4. Audio Engine (`src/audio/audioEngine.ts`)
- `createAudioEngine()`: `AudioContext` נוצר בקריאה הראשונה ל-`unlock()` בלבד (מתוך Gesture "התחל משחק"); `unlock()` קורא `resume()` ומחזיר `true`/`false` (לא נתמך / נדחה / נכשל / state ≠ `running`).
- `startTone(color)` → מחזיר `stop()`: `OscillatorNode` + `GainNode` עם Envelope קצר (attack/release ≈ 10–20ms נגד קליקים). ארבעה גבהים שונים (בהשראת Simon: ירוק ≈ 415Hz, אדום ≈ 310Hz, צהוב ≈ 252Hz, כחול ≈ 209Hz).
- `playWin()` – מוטיב עולה קצר; `playLoss()` – מוטיב יורד נמוך (גל שונה). שני מוטיבים נבדלים זה מזה ומארבעת הצבעים.
- `stopAll()` – עוצר ומנתק את כל ה-Oscillators הפעילים מיד (נקרא ב-Cleanup ובמעבר ל"אודות").
- אין מתג השתקה (PRD). הכשל מוצג כהודעה קצרה בעברית מתחת ללוח ("לא ניתן להפעיל את הצליל. נסו שוב."), והכפתור נשאר זמין לניסיון חוזר מתוך Gesture.

## 5. UI
- **`HomeScreen`**: חיווי שלב (`round` במהלך משחק; "שלב 1 מתוך 10" ב-`idle`; בסיום נשאר השלב האחרון מאחורי ה-Overlay). טקסט סטטוס: `presenting` → "המשחק מציג את הרצף"; `awaitingInput` → "התור שלך" + "הקש על הצבעים לפי הסדר"; `idle` → כפתור "התחל משחק" (מוסתר במהלך משחק).
- **`Board`**: ארבעה `button` עם `aria-label` בעברית; `onPointerDown` (ולא `click`) לפי ADR-2; `disabled` מחוץ ל-`awaitingInput`; מחלקות `--lit` (Glow) ו-`--dim` (האחרים בזמן הארה); `touch-action: manipulation`, `user-select: none`; `prefers-reduced-motion` מקצר מעברים בלבד.
- **`ResultDialog`**: `role="dialog"` מעל הלוח כש-`resultShown`: "כל הכבוד! ניצחת!" או "נפסלת!" + "הושלמו X שלבים" (בהפסד; ערך מ-`completedRounds`) + כפתור "אישור" → `dismiss`. קונפטי (`canvas-confetti`) בניצחון בלבד: מופעל פעם אחת בעת הצגת ה-Dialog (Guard לפי `gameId`, מוגן ל-Strict Mode), ו-`confetti.reset()` ב-Cleanup/`dismiss`.
- סגנון לפי DESIGN §2: Surface/Border/Primary Blue לכפתורים, Heebo, ריווח 8/12/16/24. אין אייקוני הגדרות/סאונד, אין כפתורים שאינם במסמכים.

## 6. פתרון זמני – מעבר ל"אודות" באמצע משחק
`App` מחזיק את `useGame` (כך שמעבר מסכים לא מפרק אותו). ב-`onChange` של `NavBar`, כשעוברים ל-`about` והמשחק "פעיל" (`presenting`/`awaitingInput`, או `won`/`lost` שהודעתם טרם הוצגה) – קוראים `abandon()`: מבטל את ה-Effects (דרך שינוי `presentationId`/`status`), `engine.stopAll()`, ומחזיר את הבית ל"לפני תחילת משחק". לא נרשמת תוצאה. הודעת סיום שכבר מוצגת נשארת ופתוחה כשחוזרים לבית (לא נחשבת משחק פעיל). Action ו-קריאה אלה יוסרו ב-M3 ויוחלפו ב-`pause`. הרענון מאפס הכול מעצם היות ה-State בזיכרון בלבד.

## 7. בדיקות (Vitest + RTL, Fake Timers)
**`reducer.test.ts` (טהור):** רצף 1/2/10; prefix נשמר בהוספה; חזרות צבע מותרות; הפסד בשלב 1 → `completedRounds=0`; הפסד בשלב מתקדם (שלב 5 → 4); ניצחון בשלב 10 → 10; אין שלב 11; Action לא חוקי/`presentationId` או `gameId` מיושן – State ללא שינוי; `dismiss` שומר מזהים; קלט נחסם ב-`presenting`/`won`/`lost`.
**`audioEngine.test.ts` (`AudioContext` מדומה):** `unlock` מצליח/נכשל; ארבעה גבהים שונים; `stopAll` עוצר הכול.
**`App` / `useGame` אינטגרציה (random ו-engine מוחלפים, `vi.useFakeTimers`):** תזמונים לפי הטבלה (600/250/1000); לחיצה בזמן הצגה לא משפיעה; לחיצה נכונה מקדמת, שגויה מפסידה (צליל הרבע מיידי, Dialog + צליל הפסד אחרי 1000ms); מעבר שלב עם השהיית 1000+1000; משחק שלם לשלב 10 → ניצחון, קונפטי נקרא פעם אחת; בהפסד קונפטי לא נקרא; "אישור" → "התחל משחק" → רצף חדש (random שונה) ו-`gameId` חדש; כשל `unlock` → הודעת שגיאה, המשחק לא מתקדם; מעבר ל"אודות" באמצע הצגה/קלט → אין Timers פעילים (`vi.getTimerCount()===0`), `stopAll` נקרא, חזרה לבית מציגה "התחל משחק" ו"שלב 1 מתוך 10"; Strict Mode לא מכפיל הצגה.
בדיקות M1 הקיימות נשארות ירוקות (מתעדכנות במידת הצורך לכפתורים שיהיו `disabled`).

## 8. ביצוע
1. תלויות (`canvas-confetti`) → 2. `timing`/`random`/`types`/`reducer` + בדיקות reducer → 3. `audioEngine` + בדיקות → 4. `useGame` + Sequence Controller → 5. `Board`/`ResultDialog`/`HomeScreen`/`App`/CSS → 6. בדיקות אינטגרציה → 7. `typecheck` + `test` + `build` → 8. עדכון סעיף 9 בקובץ זה → 9. `builds/milestone-2.zip` → 10. הרצה מקומית (`npm run dev`, `http://localhost:5173/simon-no-skill/`) לבדיקת המשתמש → 11. **רק אחרי אישור:** קומיט, Push ל-`main` (ע"י המשתמש דרך GitHub Desktop), וידוא Workflow ולינק חי https://yossi555.github.io/simon-no-skill/

## 9. Definition of Done – תוצאות (נבנה בפועל)
נבנה כמתוכנן: `timing`/`random`/`types`/`reducer`/`sequence`/`confetti`/`useGame`, `audioEngine`, `Board` אינטראקטיבי, `ResultDialog`, עדכוני `HomeScreen`/`App`/CSS. סטיות קטנות מהתוכנית: ה-Sequence Controller ב-`src/game/sequence.ts`; הקונפטי מאחורי עטיפה `src/game/confetti.ts` (מוזרקת בבדיקות) ומופעל ב-Timer של `revealResult` (כך שהוא פעם אחת גם ב-Strict Mode); `nextColor` נוצר רק בלחיצה האחרונה הנכונה בשלב. 35 בדיקות עוברות (reducer, אודיו, אינטגרציה עם Fake Timers); `typecheck` ו-`build` מצליחים; `builds/milestone-2.zip` נוצר.
| # | קריטריון | סטטוס |
|---|---|---|
| 1 | התחלה ב-"התחל משחק"; אורכי רצף 1/2/10; prefix נשמר | **עובר** (בדיקות reducer) |
| 2 | ארבעה צלילים והארות נבדלים; קצב קבוע | **עובר** – גבהים שונים נבדקו ביחידה, הארה נבדקה בדפדפן; **צליל בפועל לא נשמע/נבדק** (לא נבדק במכשיר) |
| 3 | לחיצות ב-`presenting` נחסמות; נכונה מקדמת; שגויה מפסידה מיד | **עובר** |
| 4 | הפסד שלב 1 (0), הפסד מתקדם, ניצחון שלב 10, אין שלב 11, רצף חדש אחרי "אישור"+"התחל משחק" | **עובר** |
| 5 | טקסט וצליל סיום; קונפטי בניצחון בלבד | **עובר** בבדיקות (קונפטי/צליל מדומים); המראה בפועל לא נבדק בדפדפן עד ניצחון |
| 6 | רענון מבטל משחק; אין שמירת מצב ב-storage | **עובר** – State בזיכרון בלבד, אין שימוש ב-storage |
| 7 | קצב לפי טבלת DESIGN; לחיצה שגויה: צליל מיידי + הפסד אחרי שנייה | **עובר** (בדיקות Fake Timers; הפסד נבדק גם בדפדפן) |
| 8 | מעבר ל"אודות" לא משאיר הארה/צליל/Timer | **עובר** (`vi.getTimerCount()===0`, `stopAll`) |

**מגבלות:** אודיו, מגע וקונפטי במכשיר פיזי (כולל מצב שקט ב-iOS) לא נבדקו. בדפדפן נבדקו: התחלה, הארת הרצף, מעבר ל"התור שלך", הפסד והודעת "נפסלת!" עם "הושלמו 0 שלבים".

**Workflow:** הסתיים בהצלחה עבור קומיט `b7ac8de`; האתר החי נטען: https://yossi555.github.io/simon-no-skill/
