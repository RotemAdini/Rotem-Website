import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import "@/styles/legal-pages.css";

export const metadata: Metadata = pageMetadata({
  title: "הצהרת נגישות | רותם עדיני",
  description: "הצהרת הנגישות של אתר רותם עדיני — מצב ההנגשה, התקן שלפיו נעשתה העבודה, מגבלות ידועות ודרכי פנייה בנושאי נגישות.",
  path: "/accessibility",
});

/**
 * The accessibility statement required by regulation 35(ה) of the Israeli
 * Equal Rights for Persons with Disabilities (Accessibility Adjustments to
 * Service) Regulations, 2013.
 *
 * Two rules govern what is written here, and both matter more than the page
 * looking finished:
 *
 * 1. It claims nothing that has not been verified. The site has had a round
 *    of accessibility work and an automated + keyboard review; it has NOT had
 *    a screen-reader pass in Hebrew or a review by a certified מורשה נגישות
 *    השירות. So this page says exactly that, and does not declare conformance
 *    with ת"י 5568 — an overstated statement is itself a legal exposure, and a
 *    quieter one costs nothing.
 *
 * 2. Nothing about Rotem or her business is invented. The site owner, the
 *    accessibility contact and its email address are confirmed and written in
 *    plainly. Everything still undecided — the dates, a phone number, a
 *    response-time commitment, a postal address, whether a מורשה נגישות
 *    השירות will review — is marked with .legal-tbd (the convention /privacy
 *    and /terms already use) rather than filled with plausible-looking values
 *    that could be published by accident.
 *
 * 3. No exemption is claimed. Regulation 35 offers an automatic economic
 *    exemption below a turnover threshold; this site deliberately does not
 *    invoke it and states so, because accessibility is being implemented here
 *    regardless of turnover. That is a decision, not an oversight, and it is
 *    written down so nobody later "helpfully" adds an exemption clause.
 */
export default function AccessibilityPage() {
  return (
    <main className="page-main page-accessibility">
      <section className="page-hero">
        <div className="container simple-hero">
          <span className="eyebrow">האתר הזה נועד לכולם</span>
          <h1>
            הצהרת נגישות <span aria-hidden="true">♡</span>
          </h1>
          <p>מה נעשה כדי שהאתר יהיה נגיש, מה עדיין בעבודה, ואיך פונים אליי בנושא.</p>
        </div>
      </section>

      <div className="container legal-shell">
        <nav className="legal-toc" aria-label="ניווט מהיר בין סעיפי הצהרת הנגישות">
          <h2>תוכן העניינים</h2>
          <ol>
            <li>
              <a href="#ac-commitment">המחויבות שלי לנגישות</a>
            </li>
            <li>
              <a href="#ac-status">מצב הנגישות באתר</a>
            </li>
            <li>
              <a href="#ac-standard">התקן שלפיו נעשתה העבודה</a>
            </li>
            <li>
              <a href="#ac-done">מה הונגש בפועל</a>
            </li>
            <li>
              <a href="#ac-tested">דפדפנים וטכנולוגיות שנבדקו</a>
            </li>
            <li>
              <a href="#ac-limits">מגבלות ידועות</a>
            </li>
            <li>
              <a href="#ac-tools">אפשרויות הנגישות באתר</a>
            </li>
            <li>
              <a href="#ac-contact">פנייה בנושאי נגישות</a>
            </li>
            <li>
              <a href="#ac-updated">עדכון ההצהרה</a>
            </li>
          </ol>
        </nav>

        <div className="legal-content">
          <p className="legal-updated">
            עדכון אחרון: <span className="legal-tbd">להשלמה: תאריך פרסום ההצהרה</span>
          </p>

          <div className="legal-draft-note">
            <span aria-hidden="true">✎</span>
            <p>
              ההצהרה הזו נכתבה לאחר סבב עבודת נגישות באתר, אך היא עדיין אינה סופית: היא אינה מצהירה על עמידה מלאה
              בתקן, משום שטרם הושלמו בדיקה עם קורא מסך בעברית ובדיקה של בעל מקצוע מוסמך. הסעיפים המסומנים ממתינים
              להשלמה לפני עליית האתר לאוויר באופן מסחרי.
            </p>
          </div>

          <section className="legal-section" id="ac-commitment">
            <h2>1. המחויבות שלי לנגישות</h2>
            <p>
              האתר הזה נועד לשמש כל אדם, לרבות אנשים עם מוגבלות. אני רואה בנגישות חלק מהעבודה על האתר ולא תוספת
              אליה, ופועלת לשפר אותה באופן שוטף.
            </p>
            <p>האתר מופעל על ידי רותם עדיני.</p>
          </section>

          <section className="legal-section" id="ac-status">
            <h2>2. מצב הנגישות באתר</h2>
            <p>
              באתר בוצע סבב התאמות נגישות שכלל בדיקה אוטומטית, בדיקת ניווט מקלדת ותיקון הליקויים שאותרו. עם זאת,
              נכון למועד פרסום ההצהרה <strong>טרם הושלם תהליך האימות</strong>, ולכן אין באתר הצהרה על עמידה מלאה
              בדרישות התקן.
            </p>
            <p>
              האתר מצהיר על <strong>עמידה חלקית</strong> בדרישות התקן: ההתאמות המפורטות בסעיף 4 בוצעו ונבדקו,
              והפערים הידועים מפורטים בסעיף 6.
            </p>
            <p>
              <strong>לא נטען כאן פטור כלשהו לפי תקנה 35</strong> — לא פטור בשל נטל כלכלי ולא אחר. הנגישות
              מיושמת באתר ללא תלות במחזור העסקאות, מתוך בחירה.
            </p>
            <p>
              <span className="legal-tbd">להשלמה: התאריך שבו הושלמה עבודת ההנגשה.</span>
            </p>
          </section>

          <section className="legal-section" id="ac-standard">
            <h2>3. התקן שלפיו נעשתה העבודה</h2>
            <p>
              עבודת ההנגשה נעשתה על בסיס <strong>תקן ישראלי 5568 חלק 1</strong>, המאמץ את הנחיות{" "}
              <span lang="en">WCAG</span> הבינלאומיות של ארגון <span lang="en">W3C</span>, ברמת התאמה{" "}
              <span lang="en">AA</span> — רמת ההתאמה הנדרשת לפי תקנות הנגישות בישראל.
            </p>
            <p>
              נכון למועד זה <strong>טרם נבדק האתר על ידי בעל מקצוע מוסמך בתחום הנגישות</strong> (מורשה נגישות
              השירות). עבודת ההנגשה בוצעה באופן פנימי.
            </p>
            <p>
              <span className="legal-tbd">
                להשלמה — החלטה נדרשת: האם להזמין בדיקה של מורשה נגישות השירות. אם תבוצע — יש לציין כאן את שמו
                ואת מועד הבדיקה.
              </span>
            </p>
          </section>

          <section className="legal-section" id="ac-done">
            <h2>4. מה הונגש בפועל</h2>
            <p>ההתאמות הבאות קיימות באתר ונבדקו:</p>
            <ul>
              <li>מבנה סמנטי לכל עמוד — אזורי ניווט, תוכן ראשי וכותרת תחתונה, והיררכיית כותרות תקינה.</li>
              <li>קישור &quot;דילוג לתוכן הראשי&quot; בתחילת כל עמוד, המעביר את המיקוד לתוכן עצמו.</li>
              <li>הפעלה מלאה באמצעות מקלדת של כל הכפתורים, הקישורים, המסננים והטפסים, בסדר מיקוד התואם לקריאה מימין לשמאל.</li>
              <li>סימון מיקוד ברור ובניגודיות מספקת בכל פקד שניתן להתמקד בו.</li>
              <li>שמות נגישים לכל הפקדים, כולל כפתורי אייקון, שדות חיפוש ורשימות בחירה.</li>
              <li>דיווח על מצב לחוץ/נבחר בכפתורי הסינון ובכפתורי השמירה למועדפים, ולא באמצעות צבע בלבד.</li>
              <li>הכרזה על שינוי במספר התוצאות בעת חיפוש או סינון.</li>
              <li>טקסט חלופי לתמונות תוכן, וסימון תמונות דקורטיביות ככאלה.</li>
              <li>תמיכה בהעדפת המערכת להפחתת תנועה (<span lang="en">prefers-reduced-motion</span>).</li>
              <li>שמירה על פריסה תקינה ללא גלילה אופקית עד לרוחב מסך של 320 פיקסלים ובהגדלת תצוגה של 200%.</li>
              <li>בוצעו תיקוני ניגודיות בטקסט ובפקדים שנבדקו; טרם הושלם אימות הניגודיות בכל התכנים והמצבים באתר.</li>
            </ul>
          </section>

          <section className="legal-section" id="ac-tested">
            <h2>5. דפדפנים וטכנולוגיות שנבדקו</h2>
            <p>
              האתר נבדק בדפדפן מבוסס <span lang="en">Chromium</span> בבדיקה אוטומטית של כללי נגישות, בבדיקת ניווט
              מקלדת ובבדיקת תצוגה ברוחבי מסך שונים ובהגדלה.
            </p>
            <p>
              <strong>טרם בוצעה בדיקה עם תוכנת הקראת מסך</strong> (כגון <span lang="en">NVDA</span> או{" "}
              <span lang="en">VoiceOver</span>) בעברית. מסיבה זו אין כאן רשימת צירופי דפדפן והקראת מסך — לא נציין
              צירוף שלא נבדק בפועל.
            </p>
            <p>
              <span className="legal-tbd">
                להשלמה: לאחר ביצוע בדיקת הקראת מסך בעברית — פירוט הצירופים שנבדקו ומועד הבדיקה.
              </span>
            </p>
          </section>

          <section className="legal-section" id="ac-limits">
            <h2>6. מגבלות ידועות</h2>
            <p>
              להלן מה שידוע לי שטרם הונגש במלואו במועד פרסום ההצהרה. אם נתקלתם בקושי נוסף, אשמח לשמוע דרך פרטי הקשר
              שבסעיף 8.
            </p>
            <ul>
              <li>
                <strong>טפסי ההרשמה בעמודי המשחקים</strong> מבוססים על שירות דיוור חיצוני. השליטה שלי בקוד שלו
                מוגבלת, ולכן ייתכנו בהם פערי נגישות. אפשר תמיד לפנות אליי ישירות דרך עמוד{" "}
                <Link href="/contact">צור קשר</Link> במקום להשתמש בטופס.
              </li>
              <li>
                <strong>טרם בוצעה בדיקה מלאה עם קורא מסך בעברית.</strong> ייתכנו ניסוחים שאינם נקראים באופן מיטבי.
              </li>
              <li>
                <strong>מסמכים להורדה</strong> — נכון להיום אין באתר מסמכים להורדה. אם יתווספו, הם יונגשו בהתאם
                לת&quot;י 5568 חלק 2.
              </li>
              <li>
                <strong>תוכן וידאו</strong> — נכון להיום אין באתר סרטוני וידאו. אם יתווספו, יתווספו להם כתוביות
                בהתאם לנדרש.
              </li>
              <li>
                <span className="legal-tbd">
                  להשלמה: כל מגבלה נוספת שתתגלה בבדיקת קורא המסך או בבדיקת בעל המקצוע.
                </span>
              </li>
            </ul>
          </section>

          <section className="legal-section" id="ac-tools">
            <h2>7. אפשרויות הנגישות באתר</h2>
            <p>
              בפינת המסך יש כפתור &quot;נגישות&quot; הפותח אפשרויות תצוגה: הגברת ניגודיות והדגשת קישורים. ההעדפות
              נשמרות בדפדפן שלכם בלבד.
            </p>
            <p>
              חשוב לי להבהיר: <strong>הכפתור הזה אינו מה שהופך את האתר לנגיש</strong>. הוא תוספת נוחות בלבד. הנגישות
              עצמה נמצאת במבנה האתר — בקוד, בניגודיות, בתמיכה במקלדת ובשמות הפקדים — ולא בתפריט הזה.
            </p>
            <p>
              להגדלת הטקסט מומלץ להשתמש בזום של הדפדפן (<span lang="en">Ctrl</span> ו־+ במחשב, או שינוי גודל הטקסט
              בהגדרות המכשיר). האתר תוכנן כך שהוא נשאר שמיש בהגדלה.
            </p>
          </section>

          <section className="legal-section" id="ac-contact">
            <h2>8. פנייה בנושאי נגישות</h2>
            <p>
              אם נתקלתם בבעיית נגישות באתר, או שיש תוכן שלא הצלחתם להגיע אליו — אשמח שתספרו לי, ואטפל בכך. בפנייה
              יעזור לי לדעת באיזה עמוד מדובר, מה ניסיתם לעשות ובאיזה מכשיר או תוכנה השתמשתם.
            </p>
            <ul>
              <li>
                <strong>אחראית הנגישות:</strong> רותם עדיני
              </li>
              <li>
                <strong>אימייל לפניות בנושא נגישות:</strong>{" "}
                <a href="mailto:rotemadini@gmail.com">
                  <span lang="en">rotemadini@gmail.com</span>
                </a>
              </li>
            </ul>
            <p>
              אפשר לפנות גם דרך עמוד <Link href="/contact">צור קשר</Link>.
            </p>
            <p>
              <span className="legal-tbd">
                להשלמה — החלטות פתוחות: האם לפרסם מספר טלפון לפניות בנושא נגישות; האם להתחייב לזמן מענה מוגדר
                (למשל תוך X ימי עסקים); והאם נדרשת כתובת דואר לפי סוג הישות המשפטית של העסק. עד שיוחלט — לא
                מופיעה כאן התחייבות שלא ניתנה.
              </span>
            </p>
          </section>

          <section className="legal-section" id="ac-updated">
            <h2>9. עדכון ההצהרה</h2>
            <p>
              ההצהרה הזו תתעדכן בכל שינוי מהותי באתר או בהתאמות הנגישות שבו, ולכל הפחות בעקבות השלמת הבדיקות
              המפורטות לעיל.
            </p>
            <p>
              <span className="legal-tbd">להשלמה: תאריך העדכון האחרון בפועל.</span>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
