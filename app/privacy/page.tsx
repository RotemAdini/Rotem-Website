import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import "@/styles/legal-pages.css";

export const metadata: Metadata = pageMetadata({
  title: "מדיניות פרטיות | רותם עדיני",
  description: "מדיניות הפרטיות של אתר רותם עדיני — אילו נתונים נאספים, לאילו ספקים הם מועברים, כמה זמן הם נשמרים ומה הזכויות שלכם.",
  path: "/privacy",
});

/**
 * The privacy policy.
 *
 * Rewritten from a technical audit of what this codebase actually does, so
 * every factual claim here is traceable to code:
 *
 *   - the two Supabase cookies and their attributes → lib/supabase/env.ts
 *     (supabaseCookieOptions) and @supabase/ssr's own defaults
 *   - the localStorage keys → lib/favorites-context.tsx,
 *     components/AccessibilityControls.tsx, components/IngredientsList.tsx
 *   - the contact form's server-side delivery → app/contact/actions.ts and
 *     lib/contact/email.ts
 *   - the SendMsg lead forms → content/games/*.html
 *   - the favourites merge on first sign-in → lib/favorites/actions.ts
 *   - the absence of any analytics or advertising tag → verified by search
 *
 * Three rules for anyone editing this file:
 *
 *   1. Do not add a claim the code does not support. In particular never
 *      write "we do not share data with third parties" (untrue — SendMsg,
 *      Supabase and Google all receive data), "the forms are demo only"
 *      (untrue since the game forms went live) or "no personal data is
 *      stored" (untrue since accounts went live).
 *   2. Section 8 states that the site carries no analytics or advertising
 *      trackers. That is true today. It must be rewritten in the same commit
 *      that introduces the first one.
 *   2a. Section 3 describes the contact form. Delivery is NOT live yet, so
 *      the section opens by saying so and describes the flow in the future
 *      tense; section 10 marks Resend as planned for the same reason. When
 *      RESEND_API_KEY is set in production, section 3 moves to the present
 *      tense and sections 10 and 13 are updated in the same commit. Nothing
 *      here may assert what Resend retains, or for how long, until that has
 *      been read off the account — the markers in sections 3 and 13 are
 *      there precisely because it has not been.
 *   3. Anything still unknown is marked with <span className="legal-tbd">
 *      rather than guessed. Those markers are visible on the page on purpose.
 */
export default function PrivacyPage() {
  return (
    <main className="page-main page-privacy">
      <section className="page-hero">
        <div className="container simple-hero">
          <span className="eyebrow">שקיפות זה חשוב לי</span>
          <h1>
            מדיניות פרטיות <span aria-hidden="true">♡</span>
          </h1>
          <p>איזה מידע נאסף באתר, לאן הוא מגיע, כמה זמן הוא נשמר ומה אפשר לעשות בקשר לזה.</p>
        </div>
      </section>

      <div className="container legal-shell">
        <nav className="legal-toc" aria-label="ניווט מהיר בין סעיפי המדיניות">
          <h2>תוכן העניינים</h2>
          <ol>
            <li><a href="#pp-operator">מי מפעיל את האתר</a></li>
            <li><a href="#pp-collected">איזה מידע נאסף — תמונה כללית</a></li>
            <li><a href="#pp-contact-form">טופס יצירת קשר</a></li>
            <li><a href="#pp-games-forms">טפסי העדכון בעמודי המשחקים</a></li>
            <li><a href="#pp-account">חשבון משתמש והתחברות עם Google</a></li>
            <li><a href="#pp-favorites">מועדפים</a></li>
            <li><a href="#pp-cookies">Cookies ואחסון מקומי בדפדפן</a></li>
            <li><a href="#pp-analytics">אנליטיקה, פרסום ובאנר Cookies</a></li>
            <li><a href="#pp-technical">מידע טכני ורישומי שרת</a></li>
            <li><a href="#pp-processors">ספקי צד שלישי</a></li>
            <li><a href="#pp-purposes">מטרות השימוש במידע</a></li>
            <li><a href="#pp-marketing">דיוור שיווקי והסרה ממנו</a></li>
            <li><a href="#pp-retention">שמירת מידע</a></li>
            <li><a href="#pp-security">אבטחה</a></li>
            <li><a href="#pp-rights">הזכויות שלכם</a></li>
            <li><a href="#pp-payments">תשלומים ורכישות</a></li>
            <li><a href="#pp-contact">יצירת קשר בענייני פרטיות</a></li>
            <li><a href="#pp-changes">שינויים במדיניות</a></li>
          </ol>
        </nav>

        <div className="legal-content">
          <p className="legal-updated">עדכון אחרון: 22 בספטמבר 2026</p>
          <div className="legal-draft-note">
            <span aria-hidden="true">✎</span>
            <p>
              המסמך מתאר את מה שהאתר עושה בפועל נכון לתאריך העדכון שלמעלה. פרטים שטרם נקבעו סופית מסומנים ברקע כתום
              ויושלמו לפני שהאתר עולה לאוויר באופן מסחרי. מסמך זה אינו מהווה ייעוץ משפטי.
            </p>
          </div>

          <section className="legal-section" id="pp-operator">
            <h2>1. מי מפעיל את האתר</h2>
            <p>האתר מופעל על ידי רותם עדיני (״אנחנו״, ״האתר״).</p>
            <ul>
              <li>דוא״ל לפניות בנושא פרטיות: <a href="mailto:rotemadini@gmail.com">rotemadini@gmail.com</a></li>
              <li>שם משפטי ומספר עוסק/ח.פ.: <span className="legal-tbd">להשלמה — שם רשום ומספר עוסק מורשה או ח.פ.</span></li>
              <li>כתובת: <span className="legal-tbd">להשלמה — כתובת עסק, אם נדרשת</span></li>
              <li>טלפון: <span className="legal-tbd">להשלמה — מספר טלפון, אם רוצים לפרסם אותו</span></li>
            </ul>
            <p>האחראי/ת על המידע באתר הוא/היא רותם עדיני, וניתן לפנות בכל שאלה בכתובת הדוא״ל שלמעלה.</p>
          </section>

          <section className="legal-section" id="pp-collected">
            <h2>2. איזה מידע נאסף — תמונה כללית</h2>
            <p>כדי שהתמונה תהיה ברורה, כדאי להתחיל מהעיקר:</p>
            <ul>
              <li>
                <strong>גלישה רגילה באתר — בלי התחברות ובלי מילוי טפסים — אינה יוצרת אצלנו רשומה עליכם, והדפדפן שלכם
                אינו מקבל שום Cookie מהאתר.</strong>
              </li>
              <li>מידע נאסף בארבעה מצבים בלבד: כששולחים הודעה בטופס יצירת הקשר, כשממלאים טופס עדכון בעמוד משחק, כשמתחברים לחשבון, וכרישום טכני אצל ספק האחסון.</li>
              <li>בנוסף, האתר שומר בדפדפן שלכם עצמו העדפות ופריטים ששמרתם. המידע הזה נשאר במכשיר ואינו נשלח אלינו כל עוד לא התחברתם.</li>
            </ul>
            <p>הפירוט המלא של כל אחד מהמצבים האלה מופיע בסעיפים הבאים.</p>
          </section>

          <section className="legal-section" id="pp-contact-form">
            <h2>3. טופס יצירת קשר</h2>
            <p>
              הטופס בעמוד <Link href="/contact">צור קשר</Link> מבקש שם, כתובת דוא״ל, נושא ותוכן הודעה.
            </p>
            <p>
              <strong>נכון למועד עדכון מסמך זה שליחת הטופס עדיין אינה פעילה.</strong> כל עוד היא אינה פעילה,
              העמוד מציג זאת במפורש, לחיצה על הכפתור אינה שולחת דבר ואיננו מקבלים מכם שום מידע דרכו. אפשר
              לכתוב אלינו ישירות לכתובת הדוא״ל שבסעיף 17. הסעיף הזה מתאר מה יקרה כשהשליחה תופעל, ויעודכן
              במועד ההפעלה.
            </p>
            <p>
              <strong>כשהשליחה תופעל:</strong> בלחיצה על ״שליחת ההודעה״ הפרטים יישלחו לשרת של האתר, שיעביר אותם
              כהודעת דוא״ל לתיבה שלנו באמצעות <strong>Resend</strong> — ספק שליחת דוא״ל שישמש אותנו כמעבד מידע.
              ההעברה מתבצעת בין השרתים: <strong>הדפדפן שלכם אינו פונה ל-Resend</strong> ואינו מקבל ממנו דבר.
              כתובת הדוא״ל שהזנתם תירשם בהודעה כ״השב אל״, כדי שנוכל לענות לכם ישירות.
            </p>
            <p>
              <strong>האתר עצמו לא ישמור את ההודעה במסד נתונים כלשהו.</strong> היא תעבור דרך השרת בזיכרון בלבד
              ותגיע לתיבת הדוא״ל שלנו. Resend, ככל ספק שליחת דוא״ל, מתעד אצלו את המשלוח; מה בדיוק נשמר שם
              ולכמה זמן — ראו סעיף 13.
            </p>
            <p>
              <strong>מה ייאסף:</strong> השם, כתובת הדוא״ל, הנושא ותוכן ההודעה שכתבתם — ותו לא. איננו מבקשים טלפון,
              כתובת או פרטי תשלום, ולא נוסיף את הכתובת לרשימת תפוצה: פנייה בטופס איננה הרשמה לדיוור. כדי
              להירשם לדיוור צריך לסמן בעצמכם תיבת הסכמה נפרדת בטופס בעמוד משחק (סעיף 4).
            </p>
            <p>
              <strong>הגנה מפני שליחה אוטומטית:</strong> בטופס יש שדה מוסתר שגולש אינו רואה ואינו יכול למלא, וכן
              בדיקה שהשליחה לא בוצעה מהר מדי אחרי טעינת העמוד. שתי הבדיקות מתבצעות בשרת ואינן אוספות עליכם מידע
              נוסף. אין באתר CAPTCHA.
            </p>
            <p>
              הודעות שהגיעו אלינו — בטופס או ישירות בדוא״ל — נשמרות בתיבת הדוא״ל לצורך מענה ומעקב. אפשר לבקש
              את מחיקתן בכל עת.
            </p>
            <p className="legal-tbd">
              להשלמה — עם הפעלת השליחה: לעדכן את הסעיף הזה כך שיתאר את הזרימה בלשון הווה, ולעדכן בהתאם את
              רשימת הספקים בסעיף 10 ואת סעיף 13.
            </p>
          </section>

          <section className="legal-section" id="pp-games-forms">
            <h2>4. טפסי העדכון בעמודי המשחקים</h2>
            <p>
              בעמודי המשחקים יש טופס ״עדכנו אותי כשהמשחק ייפתח״ המבקש <strong>שם מלא וכתובת דוא״ל</strong>, לצד
              תיבת סימון להסכמה לדיוור.
            </p>
            <p>
              <strong>הפרטים האלה נשלחים ונשמרים במערכת הדיוור SendMsg</strong> (panel.sendmsg.co.il), שהיא ספק
              ישראלי לניהול רשימות תפוצה ומשמשת אותנו כמעבדת מידע. בעת השליחה מועברים אליה, מלבד השם והדוא״ל, גם
              נתוני הגלישה הרגילים שכל אתר מקבל: כתובת ה-IP שלכם, סוג הדפדפן והעמוד שממנו הגעתם.
            </p>
            <p>למה משמש המידע הזה:</p>
            <ul>
              <li>לשליחת הודעה כשהמשחק או החבילה נפתחים לרכישה;</li>
              <li>
                לשליחת עדכונים, הטבות ותוכן שיווקי בדוא״ל — <strong>אך ורק אם סימנתם בעצמכם את תיבת ההסכמה</strong>.
                התיבה אינה מסומנת מראש, ולא ניתן לשלוח את הטופס בלי לסמן אותה. ראו סעיף 12 להסרה מהדיוור.
              </li>
            </ul>
            <p>
              מלבד SendMsg, איננו מוכרים את רשימת התפוצה ואיננו מעבירים אותה למפרסמים או לגורמים מסחריים אחרים.
            </p>
          </section>

          <section className="legal-section" id="pp-account">
            <h2>5. חשבון משתמש והתחברות עם Google</h2>
            <p>
              פתיחת חשבון באתר היא רשות ואינה נדרשת כדי לקרוא מתכונים, רעיונות לדייטים או עמודי משחקים. מי שבוחר
              להתחבר עושה זאת <strong>באמצעות חשבון Google בלבד</strong> — אין באתר סיסמאות, אין הרשמה עם דוא״ל
              וסיסמה, ואיננו שומרים סיסמאות מכל סוג.
            </p>
            <p>מ-Google אנחנו מקבלים את פרטי הזהות הבסיסיים בלבד:</p>
            <ul>
              <li>מזהה המשתמש אצל Google;</li>
              <li>כתובת הדוא״ל והאם היא מאומתת;</li>
              <li>שם פרטי, שם משפחה ושם מלא;</li>
              <li>כתובת תמונת הפרופיל.</li>
            </ul>
            <p>
              ההרשאות שמבוקשות הן הבסיסיות שמספקת Google לזיהוי בלבד. <strong>אין לאתר גישה לתיבת הדוא״ל שלכם,
              ליומן, לאנשי הקשר או לקבצים שלכם.</strong>
            </p>
            <p>
              פרטי החשבון והמידע שנוצר בו נשמרים אצל <strong>Supabase</strong>, ספק תשתית שמספק לאתר את שירותי
              ההתחברות ומסד הנתונים. Supabase מנהלת גם רישום אבטחה של אירועי התחברות, שכולל כתובת IP.
              אזור האחסון של פרויקט Supabase: <span className="legal-tbd">להשלמה — לאשר בלוח הבקרה של Supabase</span>.
            </p>
            <p>
              תמונת הפרופיל מוצגת בעמודי החשבון על ידי טעינה ישירה משרתי Google, כך שבעת צפייה בעמודים אלה
              הדפדפן שלכם פונה ל-Google. הבקשה נשלחת בלי כתובת העמוד המפנה.
            </p>
          </section>

          <section className="legal-section" id="pp-favorites">
            <h2>6. מועדפים</h2>
            <p>
              לחיצה על הלב שומרת פריט לרשימת המועדפים. ההתנהגות שונה לפי מצב ההתחברות:
            </p>
            <ul>
              <li>
                <strong>בלי חשבון:</strong> הרשימה נשמרת בדפדפן שלכם בלבד (localStorage). היא אינה נשלחת אלינו,
                ואנחנו לא יודעים מה שמרתם.
              </li>
              <li>
                <strong>עם חשבון:</strong> הרשימה נשמרת בחשבון אצל Supabase, כדי שתהיה זמינה בכל מכשיר. נשמרים
                מזהה המשתמש, סוג הפריט, מזהה הפריט ומועד השמירה — ותו לא.
              </li>
            </ul>
            <p>
              <strong>מיזוג בעת התחברות:</strong> בהתחברות הראשונה, פריטים שנשמרו בדפדפן כאורח מצורפים אוטומטית
              לחשבון שלכם ב-Supabase. גם בהתחברויות הבאות עשויים להצטרף לחשבון פריטים חדשים שנשמרו כאורח
              וטרם מוזגו אליו. משמעות הדבר היא שפריטים שנשמרו קודם לכן באופן אנונימי הופכים לחלק מהמידע
              המשויך לחשבון שלכם. הרשימה המקומית בדפדפן אינה נמחקת בתהליך.
            </p>
          </section>

          <section className="legal-section" id="pp-cookies">
            <h2>7. Cookies ואחסון מקומי בדפדפן</h2>
            <p>
              <strong>גולש שאינו מתחבר אינו מקבל מהאתר אף Cookie.</strong> האתר משתמש בשני Cookies בלבד, שניהם
              של צד ראשון (הדומיין של האתר עצמו), ושניהם נוצרים רק בעת התחברות לחשבון:
            </p>
            <ul>
              <li>
                <strong>sb-…-auth-token</strong> — עוגיית ההתחברות עצמה. בלעדיה אי אפשר להישאר מחוברים. תוקף: עד 400
                ימים, או עד להתנתקות.
              </li>
              <li>
                <strong>sb-…-auth-token-code-verifier</strong> — עוגיית אבטחה זמנית המשמשת בתהליך ההתחברות עצמו
                ומתבטלת מיד בסיומו.
              </li>
            </ul>
            <p>
              שתי העוגיות הן <strong>עוגיות הכרחיות</strong>: הן קיימות אך ורק כדי לספק את שירות ההתחברות שביקשתם,
              הן אינן עוקבות אחריכם באתרים אחרים ואינן משמשות לפרסום או לפילוח. בסביבת הייצור הן מסומנות
              כ-Secure ומועברות בחיבור מוצפן בלבד.
            </p>
            <p>
              בנוסף, האתר שומר מידע <strong>באחסון המקומי של הדפדפן (localStorage)</strong>. רוב ההעדפות נשארות במכשיר
              שלכם בלבד. יוצאים מן הכלל הם המועדפים שנשמרו כאורח: הם עשויים להישלח לחשבון שלכם ב-Supabase
              בעת התחברות, לרבות בהתחברויות חוזרות, כפי שמפורט בסעיף 6:
            </p>
            <ul>
              <li><strong>rotemFavorites</strong> — הפריטים ששמרתם כאורח.</li>
              <li><strong>rotemFavoritesMergedTokens</strong> — רישום אילו פריטים כבר צורפו לאיזה חשבון, כדי שמיזוג לא יחזור על עצמו. רשומה זו כוללת את מזהה החשבון ואינה נמחקת אוטומטית בהתנתקות.</li>
              <li><strong>rotemFavoritesUnresolved</strong> — פריטים שמורים שלא נמצאה להם התאמה, כדי שלא ייעלמו בשקט.</li>
              <li><strong>rotem-accessibility-preferences</strong> — הגדרות הנגישות שבחרתם (ניגודיות גבוהה, הדגשת קישורים). נשמרות במכשיר בלבד ואינן משויכות לחשבון.</li>
              <li><strong>rotemIngredientChecks:…</strong> — סימון המצרכים שכבר הכנתם בעמוד מתכון.</li>
            </ul>
            <p>
              אפשר למחוק את כל האמור לעיל בכל רגע דרך הגדרות הדפדפן (מחיקת Cookies ונתוני אתרים). מחיקה כזו תנתק
              אתכם מהחשבון ותאפס את ההעדפות והפריטים השמורים בדפדפן הזה; פריטים שנשמרו בחשבון עצמו יחזרו בהתחברות הבאה.
            </p>
          </section>

          <section className="legal-section" id="pp-analytics">
            <h2>8. אנליטיקה, פרסום ובאנר Cookies</h2>
            <p>
              נכון למועד עדכון מסמך זה, <strong>אין באתר כלי אנליטיקה, פיקסלים או כלי פרסום מכל סוג</strong> — אין
              Google Analytics, אין Meta Pixel, אין Google Tag Manager, אין רשתות פרסום, אין רימרקטינג ואין כלי
              יצירת טביעת אצבע של דפדפן. איננו מבצעים פילוח פרסומי ואיננו מעבירים מידע למפרסמים.
            </p>
            <p>
              מכיוון שכל העוגיות באתר הן הכרחיות לתפעול ההתחברות, ואין בו שום כלי מדידה או פרסום —
              <strong> אין באתר באנר הסכמה ל-Cookies, ואין בכך חוסר.</strong> באנר כזה נועד לבקש הסכמה לשימושים
              שאינם הכרחיים, ושימושים כאלה פשוט לא קיימים כאן.
            </p>
            <p>
              אם וכאשר יתווסף כלי מדידה או פרסום, סעיף זה יתעדכן, והכלי לא יופעל לפני שתינתן לכם אפשרות אמיתית
              לבחור אם להסכים לו.
            </p>
          </section>

          <section className="legal-section" id="pp-technical">
            <h2>9. מידע טכני ורישומי שרת</h2>
            <p>
              האתר מיועד להתארח בשירות <strong>Netlify</strong>. כמו כל שרת אינטרנט, הוא רושם נתוני בקשה טכניים:
              כתובת IP, סוג הדפדפן והמכשיר, העמוד שנטען, מועד הבקשה והעמוד המפנה. רישומים אלה משמשים לתפעול תקין,
              לאבחון תקלות ולאבטחה, ולא לפילוח שיווקי.
            </p>
            <p className="legal-tbd">
              להשלמה — לאשר את שם ספק האחסון בפועל עם עליית האתר לאוויר. אם ייבחר ספק אחר, יש לעדכן סעיף זה ואת
              רשימת הספקים בסעיף 10.
            </p>
            <p>
              משך שמירת רישומי השרת: <span className="legal-tbd">להשלמה — לפי מדיניות השמירה של Netlify בחשבון שבו
              האתר מתארח</span>.
            </p>
            <p>
              בנוסף, גופני הטקסט של האתר נטענים כיום משירות <strong>Google Fonts</strong>. משמעות הדבר היא
              שבטעינת כל עמוד הדפדפן שלכם פונה לשרתי Google, ובפנייה זו נחשפות כתובת ה-IP וסוג הדפדפן שלכם.
              Google Fonts אינו מציב Cookies. בכוונתנו לארח את הגופנים באתר עצמו כדי לבטל פנייה זו.
            </p>
          </section>

          <section className="legal-section" id="pp-processors">
            <h2>10. ספקי צד שלישי</h2>
            <p>
              כדי להפעיל את האתר אנחנו נעזרים בספקים חיצוניים. כל ספק מקבל אך ורק את המידע הדרוש לו לצורך השירות
              שהוא מספק:
            </p>
            <ul>
              <li><strong>Supabase</strong> — התחברות, חשבונות ומסד הנתונים של המועדפים.</li>
              <li><strong>Google</strong> — שירות ההתחברות (Google OAuth), הצגת תמונת הפרופיל וטעינת גופני הטקסט.</li>
              <li><strong>SendMsg</strong> — מערכת הדיוור שאליה מגיעים הפרטים מטפסי העדכון בעמודי המשחקים.</li>
              <li><strong>Resend</strong> — שירות שליחת הדוא״ל שיעביר אלינו הודעות מטופס יצירת הקשר (מתוכנן; ראו סעיף 3).</li>
              <li><strong>Netlify</strong> — אחסון האתר (מתוכנן; ראו סעיף 9).</li>
              <li><strong>Sanity</strong> — מערכת ניהול התוכן שבה נכתבים המתכונים והעמודים. התוכן נשלף בעת בניית האתר, ולכן <strong>הדפדפן שלכם אינו פונה ל-Sanity בגלישה רגילה</strong>.</li>
            </ul>
            <p>
              מעבר לספקים אלה, איננו מוכרים מידע אישי ואיננו מעבירים אותו לצדדים שלישיים למטרות פרסום. מידע עשוי
              להימסר לגורם נוסף רק אם נידרש לכך על פי דין או על ידי רשות מוסמכת.
            </p>
            <p>מדיניות הפרטיות של כל אחד מהספקים:</p>
            <ul>
              <li>
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" lang="en">
                  Supabase
                </a>{" "}
                <span className="sr-only">(נפתח בחלון חדש)</span>
              </li>
              <li>
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" lang="en">
                  Google
                </a>{" "}
                <span className="sr-only">(נפתח בחלון חדש)</span>
              </li>
              <li>
                <a href="https://www.sendmsg.co.il/privacy/" target="_blank" rel="noopener noreferrer">
                  שלח מסר <span lang="en">(SendMsg)</span>
                </a>{" "}
                <span className="sr-only">(נפתח בחלון חדש)</span>
              </li>
              <li>
                <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" lang="en">
                  Resend
                </a>{" "}
                <span className="sr-only">(נפתח בחלון חדש)</span>
              </li>
              <li>
                <a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener noreferrer" lang="en">
                  Netlify
                </a>{" "}
                <span className="sr-only">(נפתח בחלון חדש)</span>
              </li>
              <li>
                <a href="https://www.sanity.io/legal/privacy" target="_blank" rel="noopener noreferrer" lang="en">
                  Sanity
                </a>{" "}
                <span className="sr-only">(נפתח בחלון חדש)</span>
              </li>
            </ul>
            <p>
              באתר מופיעים גם קישורים לפרופילים שלנו ברשתות חברתיות (Instagram, Facebook, TikTok, YouTube). אלה
              קישורים רגילים בלבד — <strong>אין באתר תוספים או תכנים מוטמעים של הרשתות</strong>, ושום מידע אינו
              מועבר אליהן אלא אם לחצתם על הקישור ועברתם לאתר שלהן.
            </p>
          </section>

          <section className="legal-section" id="pp-purposes">
            <h2>11. מטרות השימוש במידע</h2>
            <ul>
              <li>הפעלת האתר והצגת התוכן;</li>
              <li>אספקת שירות ההתחברות, החשבון והמועדפים;</li>
              <li>מענה לפניות שהגיעו אלינו בטופס יצירת הקשר או בדוא״ל;</li>
              <li>הודעה על פתיחת משחק או חבילה לרכישה, למי שהשאיר פרטים;</li>
              <li>שליחת עדכונים, הטבות ותוכן שיווקי — רק למי שנתן לכך הסכמה מפורשת;</li>
              <li>אבטחת האתר, איתור תקלות ומניעת שימוש לרעה;</li>
              <li>עמידה בחובות שבדין.</li>
            </ul>
            <p>מסירת המידע באתר היא וולונטרית. אין חובה חוקית למסור אותו, אך בלי מסירתו לא נוכל לספק את השירות הרלוונטי — למשל, בלי כתובת דוא״ל לא נוכל לעדכן אתכם כשמשחק נפתח, ובלי התחברות לא נוכל לשמור מועדפים בין מכשירים.</p>
          </section>

          <section className="legal-section" id="pp-marketing">
            <h2>12. דיוור שיווקי והסרה ממנו</h2>
            <p>
              אנחנו שולחים דיוור שיווקי בדוא״ל <strong>רק למי שסימן בעצמו את תיבת ההסכמה</strong> באחד מטפסי האתר.
              תיבת ההסכמה אינה מסומנת מראש, ואיננו מוסיפים כתובות לרשימת התפוצה על סמך רכישה, פנייה בדוא״ל או פתיחת
              חשבון.
            </p>
            <p>אפשר להסיר את ההסכמה בכל עת, בשתי דרכים:</p>
            <ul>
              <li>באמצעות קישור ההסרה שמופיע בתחתית כל הודעת דיוור;</li>
              <li>בפנייה אלינו בדוא״ל <a href="mailto:rotemadini@gmail.com">rotemadini@gmail.com</a>.</li>
            </ul>
            <p>
              תיעוד מועד ואופן מתן ההסכמה: <span className="legal-tbd">להשלמה — לאמת מול SendMsg האם המערכת שומרת
              חותמת זמן ותיעוד של ההסכמה לכל נרשם, ולציין זאת כאן</span>.
            </p>
          </section>

          <section className="legal-section" id="pp-retention">
            <h2>13. שמירת מידע</h2>
            <p>ככלל, מידע נשמר כל עוד הוא נחוץ למטרה שלשמה נאסף, ולאחר מכן נמחק או מבוטל הקישור שלו אליכם.</p>
            <ul>
              <li>
                <strong>חשבון ומועדפים:</strong> נשמרים כל עוד החשבון קיים. מחיקת החשבון מוחקת איתה גם את רשימת
                המועדפים. משך שמירה לאחר מחיקה או חוסר פעילות ממושך:{" "}
                <span className="legal-tbd">להשלמה — להחליט על תקופת שמירה לחשבונות שנמחקו או לא פעילים</span>.
              </li>
              <li>
                <strong>רשימת התפוצה ב-SendMsg:</strong> נשמרת עד להסרה מהדיוור. משך שמירה מדויק ומדיניות מחיקה
                לאחר הסרה: <span className="legal-tbd">להשלמה — לבדוק את הגדרות השמירה בחשבון SendMsg</span>.
              </li>
              <li>
                <strong>הודעות מטופס יצירת הקשר ומדוא״ל:</strong> נשמרות בתיבת הדוא״ל שלנו לצורך מענה ומעקב,
                וניתנות למחיקה לפי בקשה. מה נשמר אצל Resend עם הפעלת השליחה, ולכמה זמן:{" "}
                <span className="legal-tbd">להשלמה — לאמת בהגדרות חשבון Resend מה נשמר ולכמה זמן, ולציין זאת כאן</span>.
              </li>
              <li>
                <strong>רישומי שרת:</strong> <span className="legal-tbd">להשלמה — לפי מדיניות Netlify</span>.
              </li>
            </ul>
          </section>

          <section className="legal-section" id="pp-security">
            <h2>14. אבטחה</h2>
            <p>אמצעי ההגנה שננקטים באתר כוללים, בין היתר:</p>
            <ul>
              <li>העברת כל התעבורה בחיבור מוצפן (HTTPS);</li>
              <li>הפרדת הרשאות במסד הנתונים, כך שכל משתמש יכול לקרוא ולשנות רק את הרשומות שלו עצמו;</li>
              <li>שמירת מפתחות גישה רגישים בצד השרת בלבד, באופן שאינו נגיש מהדפדפן;</li>
              <li>היעדר סיסמאות באתר — ההתחברות מתבצעת דרך Google, ולכן אין באתר סיסמה שניתן לגנוב;</li>
              <li>סימון עוגיית ההתחברות כ-Secure בסביבת הייצור.</li>
            </ul>
            <p>
              עם זאת, שום מערכת אינה חסינה לחלוטין, ואיננו יכולים להתחייב להגנה מוחלטת על מידע המועבר או מאוחסן
              באמצעים דיגיטליים.
            </p>
          </section>

          <section className="legal-section" id="pp-rights">
            <h2>15. הזכויות שלכם</h2>
            <p>בכפוף לדין החל, ובכלל זה חוק הגנת הפרטיות, עומדות לכם הזכויות הבאות:</p>
            <ul>
              <li><strong>עיון</strong> — לבקש לדעת איזה מידע נשמר עליכם;</li>
              <li><strong>תיקון</strong> — לבקש לתקן מידע שאינו נכון או אינו מעודכן;</li>
              <li><strong>מחיקה</strong> — לבקש למחוק מידע שאינו נחוץ עוד למטרה שלשמה נאסף;</li>
              <li><strong>הסרה מדיוור</strong> — להפסיק לקבל דיוור שיווקי, מיידית ובלי לנמק;</li>
              <li><strong>ביטול הסכמה</strong> — לחזור בכם מהסכמה שנתתם, מכאן ולהבא.</li>
            </ul>
            <p>
              לממש כל אחת מהזכויות אפשר בפנייה לדוא״ל <a href="mailto:rotemadini@gmail.com">rotemadini@gmail.com</a>.
              נשתדל להשיב בהקדם. נכון להיום מחיקת חשבון מתבצעת בפנייה אלינו ולא דרך ממשק באתר.
            </p>
          </section>

          <section className="legal-section" id="pp-payments">
            <h2>16. תשלומים ורכישות</h2>
            <p>
              <strong>נכון למועד עדכון מסמך זה לא ניתן לבצע רכישה באתר, ואיננו אוספים פרטי תשלום כלשהם.</strong>{" "}
              עמודי המשחקים מציגים מחיר מתוכנן ומאפשרים להשאיר פרטים לקבלת עדכון בלבד.
            </p>
            <p>
              <span className="legal-tbd">
                להשלמה — כאשר תיפתח הסליקה: שם ספק הסליקה וקישור למדיניות הפרטיות שלו, אילו פרטי רכישה יישמרו אצלנו
                (מזהה עסקה, סכום, מוצר, סטטוס), תקופת שמירת רשומות הרכישה לפי דרישות דיני המס, והבהרה שפרטי כרטיס
                האשראי מעובדים אצל ספק הסליקה ואינם נשמרים באתר.
              </span>
            </p>
          </section>

          <section className="legal-section" id="pp-contact">
            <h2>17. יצירת קשר בענייני פרטיות</h2>
            <p>
              בכל שאלה, בקשה או תלונה בנוגע לפרטיות ולמידע שנשמר עליכם, אפשר לפנות בדוא״ל{" "}
              <a href="mailto:rotemadini@gmail.com">rotemadini@gmail.com</a> או דרך עמוד{" "}
              <Link href="/contact">צור קשר</Link>.
            </p>
          </section>

          <section className="legal-section" id="pp-changes">
            <h2>18. שינויים במדיניות</h2>
            <p>
              מדיניות זו עשויה להתעדכן, בין היתר כאשר נוספים לאתר שירותים או ספקים חדשים. תאריך העדכון האחרון
              מופיע בראש המסמך. בשינוי מהותי — למשל הוספת כלי מדידה או פרסום, או פתיחת הסליקה — נעדכן את המסמך
              ונציין זאת באופן ברור.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
