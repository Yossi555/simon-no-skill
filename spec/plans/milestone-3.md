# תוכנית – Milestone 3: השהיה וחידוש משחק

מקורות: `spec/MILESTONES.md` (Milestone 3), `spec/PRD.md` (תרחיש "מעבר למסך אודות והמשך משחק", §4.3, Edge Cases), `spec/ARCHITECTURE.md` (§2.4 כללים 3, 5–7, 9; §2.6; ADR-3), `spec/DESIGN.md` (§1.1 מצב "מושהה", טבלת הקצב). אין יכולות מעבר למסמכים. מצב ההתחלה: M2 הושלם, כולל ה-Action הזמני `abandon`.

## 0. גבולות ה-Milestone
**בפנים:** מצב `paused`, Actions `pause`/`resume`, Visibility Handler (`visibilitychange` + `pagehide`), החלפת `abandon` בהשהיה, UI של מצב מושהה, Gesture אודיו ב-"המשך משחק", בדיקות.
**מחוץ (לא נבנה):** היסטוריה ו-`localStorage` (M4), PWA (M5). אין שמירת מצב מושהה לאחסון – Refresh מאפס.

## 1. שינויים בקבצים
```
src/game/types.ts        – GameStatus + 'paused'; Actions: pause, resume; הסרת abandon
src/game/reducer.ts      – pause/resume; הסרת abandon
src/game/useGame.ts      – pause(), resume() (עם unlock), Visibility Handler; הסרת abandon()
src/App.tsx              – navigate: מעבר ל"אודות" קורא game.pause()
src/screens/HomeScreen.tsx – מצב מושהה: "המשחק מושהה" + "המשך משחק" + הודעת שגיאת אודיו
src/components/Board.tsx – prop `paused` → מחלקה board--paused (עמעום)
src/styles/app.css       – .board--paused
בדיקות: reducer.test.ts, game.test.tsx (החלפת בדיקות abandon), App.test.tsx לפי הצורך
```
אין תלויות חדשות.

## 2. Reducer (ADR-3)
| Action | תנאי | פעולה |
|---|---|---|
| `pause` | `presenting` / `awaitingInput` בלבד | `status=paused`, `inputIndex=0`, `presentationId++` (סיום Playback / `showNextRound` מיושנים מתעלמים). הרצף ו-`completedRounds` לא משתנים |
| `resume` | `paused` בלבד | `status=presenting`, `inputIndex=0`, `presentationId++`; אותו `sequence`, אותו `round` |

- **השהיה בזמן המעבר בין שלבים** (`presenting` עם `completedRounds===round`, כלומר הצבע החדש כבר נוסף והמספר עוד לא התעדכן): ההשהיה משלימה את המעבר – `round = completedRounds + 1`. כך במצב מושהה `round` תואם תמיד לאורך הרצף, וב-"המשך משחק" מוצג הרצף המלא של השלב הבא (אחרי 1000ms, כרגיל). לא נוסף צבע, ושום שלב לא "אבד".
- `idle` / `won` / `lost` / `paused` – `pause` מחזיר את אותו State (משחק שהסתיים או לא התחיל לא מושפע). `press` ב-`paused` – ללא שינוי (כבר מכוסה, כי `press` מתקבל רק ב-`awaitingInput`).
- Action `abandon` מוסר (ADR-3: "Action `abandon` הזמני של Milestone 2 הוסר").

## 3. `useGame`
- **`pause()`** – אחת לכל המקורות (ניווט, `visibilitychange`→`hidden`, `pagehide`): אם `status` ∈ {`presenting`,`awaitingInput`}: `endHold()` (לחיצה מוחזקת), `engine.stopAll()`, `setLit(null)`, `dispatch(pause)`. ה-Cleanup של Effect ההצגה מבטל את כל ה-Timers מיד (שינוי `status`/`presentationId`).
- **`resume()`** – מתוך Gesture של "המשך משחק": Guard מפני לחיצה כפולה (אותו `starting` ref של `start`), `await engine.unlock()`; בכשל – נשארים `paused` עם `audioError` (ללא התקדמות שקטה); בהצלחה – בדיקה חוזרת שהמצב עדיין `paused` (אולי הוסתר בזמן ה-await) ואז `dispatch(resume)`. ה-Effect הקיים מציג את הרצף עם 1000ms המתנה (DESIGN: "אחרי התחל משחק או המשך משחק").
- **Visibility Handler** – `useEffect` אחד: `document.addEventListener('visibilitychange')` (רק כש-`document.visibilityState==='hidden'`) ו-`window.addEventListener('pagehide')` → `pause()`. חזרה ל-`visible` לא עושה דבר (אין Resume אוטומטי). Cleanup מסיר מאזינים.
- **סיום משחק (`won`/`lost`) לפני הצגת ההודעה** – לא מושפע מניווט/הסתרה (ADR-3), בשונה מ-M2: ההודעה, הצליל והקונפטי מופיעים אחרי 1000ms כרגיל, וההודעה ממתינה במסך הבית אם המשתמש עבר ל"אודות". (זה גם מאפשר ל-M4 לרשום את התוצאה ברגע הכניסה ל-`won`/`lost` לפי ADR-4.)

## 4. UI (DESIGN §1.1, מצב "מושהה")
- `HomeScreen` ב-`paused`: חיווי שלב "שלב X מתוך 10" (השלב הנוכחי), טקסט "המשחק מושהה", כפתור ראשי כחול "המשך משחק" → `resume()`, והודעת "לא ניתן להפעיל את הצליל. נסו שוב." בכשל אודיו. "התחל משחק" לא מוצג במצב זה; "המשך משחק" מוצג **רק** ב-`paused`.
- `Board`: `disabled` (כמו בכל מצב שאינו `awaitingInput`) + מחלקה `board--paused` שמעמעמת את כל הרבעים (opacity דומה ל-`quadrant--dim`).

## 5. בדיקות (Vitest + RTL, Fake Timers)
**reducer:** `pause` מ-`presenting`/`awaitingInput` → `paused`, `inputIndex=0`, `presentationId` עולה, רצף ו-`round` נשמרים; `pause` במעבר בין שלבים → `round` הבא; `pause` ב-`idle`/`won`/`lost`/`paused` – ללא שינוי; `resume` רק מ-`paused`, אותו רצף ושלב; `presentationDone`/`showNextRound` עם מזהה ישן אחרי pause – ללא שינוי; `press` ב-`paused` – ללא שינוי.
**אינטגרציה:**
- מעבר ל"אודות" באמצע הצגה / באמצע קלט (אחרי חלק מהרצף) / בין שלבים → `stopAll` נקרא, אין הארה, `vi.getTimerCount()===0`; חזרה לבית מציגה "המשחק מושהה" + "המשך משחק", אותו שלב, ושום צליל/Timer לא מופעל לאחר 10 שניות.
- "המשך משחק" → `unlock` נקרא, אחרי 1000ms מוצג **כל** הרצף (אותם צבעים, באותו סדר, אותו אורך), ואז "התור שלך" – וצריך לשחזר מההתחלה (הקשת הצבע הראשון נחשבת לאינדקס 0).
- כשל `unlock` ב-"המשך משחק" → הודעת שגיאה, נשאר מושהה; ניסיון חוזר מצליח.
- לחיצה כפולה מהירה על "המשך משחק" → הצגה אחת בלבד.
- `visibilitychange` ל-`hidden` ו-`pagehide` → אותה השהיה; `visibilitychange` ל-`visible` → אין חידוש אוטומטי.
- לחיצה על רבע במצב מושהה – אין שינוי.
- סיום (`lost`) ואז מעבר ל"אודות" לפני ההודעה → אין השהיה, ההודעה מוצגת בחזרה לבית; "המשך משחק" לא מוצג ב-`idle`/`won`/`lost`.
- Strict Mode: השהיה וחידוש לא מכפילים הצגה.
- רענון: State בזיכרון בלבד (ללא שימוש ב-storage) – בדיקת mount חדש מציג `idle`.

## 6. ביצוע
1. types/reducer + בדיקות → 2. `useGame` (pause/resume/visibility) → 3. `App`/`HomeScreen`/`Board`/CSS → 4. בדיקות אינטגרציה (החלפת בדיקות `abandon`) → 5. `typecheck` + `test` + `build` → 6. עדכון סעיף 7 בקובץ זה → 7. `builds/milestone-3.zip` → 8. הרצה מקומית `http://localhost:5173/simon-no-skill/` → 9. **רק אחרי אישור:** קומיט, Push ל-`main`, וידוא Workflow ולינק חי https://yossi555.github.io/simon-no-skill/

## 7. Definition of Done – תוצאות (נבנה בפועל)
נבנה כמתוכנן: Actions `pause`/`resume` ב-Reducer (כולל השלמת מעבר שלב בהשהיה), `pause()`/`resume()` ו-Visibility Handler ב-`useGame`, הסרת `abandon`, מצב מושהה ב-`HomeScreen` ("המשחק מושהה" + "המשך משחק"), עמעום `board--paused`. ללא סטיות מהתוכנית. 47 בדיקות עוברות (16 reducer, 31 אודיו/אינטגרציה/App); `typecheck` ו-`build` מצליחים; `builds/milestone-3.zip` נוצר.
| # | קריטריון | סטטוס |
|---|---|---|
| 1 | מעבר ל"אודות" בזמן הצגה ובזמן שחזור משהה ועוצר מיד הארה וצליל | **עובר** – בדיקות (הצגה / קלט / בין שלבים: `stopAll`, אין הארה, `vi.getTimerCount()===0`); נבדק גם בדפדפן |
| 2 | חזרה ל"בית" לא מפעילה את הרצף; "המשך משחק" רק במשחק מושהה | **עובר** – בדיקות (10 שניות ללא צליל; הכפתור לא מוצג ב-`idle`/`lost`/אחרי "אישור"); נבדק בדפדפן |
| 3 | "המשך משחק" מציג את כל הרצף גם אם חלקו הוקש; אותו שלב, בלי צבע חדש | **עובר** – בדיקה: שלב 3 אחרי הקשת 2 צבעים → מוצגים 3 הצבעים, ונדרש שחזור מלא; נבדק בדפדפן |
| 4 | הסתרה וחזרה – אותו כלל, בלי שינוי מ-Callback שבוטל | **עובר** בבדיקות (`visibilitychange`→`hidden`, `pagehide`; `visible` לא מחדש; מזהי הצגה מיושנים מתעלמים). **לא נבדק במכשיר אמיתי** (נעילת טלפון / מעבר אפליקציה) |
| 5 | השהיה אינה הפסד; רענון מאפס משחק פעיל | **עובר** – אין מעבר ל-`lost`/צליל הפסד בהשהיה; State בזיכרון בלבד (בדיקת mount חדש → `idle`) |

**מגבלות:** אודיו, נעילת מסך ומעבר לרקע במכשיר פיזי לא נבדקו. בדפדפן נבדקו: התחלה → "אודות" → "בית" (מושהה, לוח מעומעם) → "המשך משחק" → הצגה מחדש → "התור שלך".

**Workflow:** הסתיים בהצלחה עבור קומיט `3896360`; האתר החי מגיש את ה-Build החדש (כולל "המשך משחק"): https://yossi555.github.io/simon-no-skill/
