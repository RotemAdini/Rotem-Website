import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/legal-pages.css";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | רותם עדיני",
  description: "מדיניות הפרטיות של אתר רותם עדיני — אילו נתונים נאספים, איך הם נשמרים ומשמשים, וזכויות המשתמש.",
};

export default function PrivacyPage() {
  return (
    <main className="page-main page-privacy">
      <section className="page-hero">
        <div className="container simple-hero">
          <span className="eyebrow">שקיפות זה חשוב לי</span>
          <h1>
            מדיניות פרטיות <span>♡</span>
          </h1>
          <p>איך אנחנו אוספים, שומרים ומשתמשים במידע באתר הזה.</p>
        </div>
      </section>

      <div className="container legal-shell">
        <nav className="legal-toc" aria-label="ניווט מהיר בין סעיפי המדיניות">
          <h2>תוכן העניינים</h2>
          <ol>
            <li><a href="#pp-collected">איזה מידע נאסף</a></li>
            <li><a href="#pp-forms">מידע שנמסר בטפסים</a></li>
            <li><a href="#pp-purchase">מידע ברכישה</a></li>
            <li><a href="#pp-cookies">Cookies ו-Analytics</a></li>
            <li><a href="#pp-use">שימוש במידע</a></li>
            <li><a href="#pp-third-parties">ספקי צד שלישי</a></li>
            <li><a href="#pp-newsletter">שירות דיוור</a></li>
            <li><a href="#pp-payments">שירותי תשלום</a></li>
            <li><a href="#pp-retention">שמירת מידע</a></li>
            <li><a href="#pp-security">אבטחה</a></li>
            <li><a href="#pp-rights">זכויות המשתמש</a></li>
            <li><a href="#pp-contact">יצירת קשר</a></li>
            <li><a href="#pp-changes">שינויים במדיניות</a></li>
          </ol>
        </nav>

        <div className="legal-content">
          <p className="legal-updated">עדכון אחרון: 5 בספטמבר 2026</p>
          <div className="legal-draft-note">
            <span>✎</span>
            <p>מסמך זה הוא טיוטת עבודה ראשונית שנועדה לתאר את המנגנון הצפוי באתר. פרטים משפטיים וחלקים המחכים לאימות סופי מסומנים בהתאם, ויושלמו לפני שהאתר עולה לאוויר באופן מסחרי.</p>
          </div>

          <section className="legal-section" id="pp-collected">
            <h2>1. איזה מידע נאסף</h2>
            <p>האתר עשוי לאסוף מידע בשני אופנים עיקריים: מידע שאתם מוסרים באופן יזום (למשל בטופס יצירת קשר, בהרשמה לניוזלטר או ברכישה), ומידע טכני שנאסף אוטומטית בעת הגלישה, כגון סוג דפדפן, מכשיר ודפים שבהם ביקרתם.</p>
            <p><span className="legal-tbd">להשלמה: רשימה מדויקת וסופית של כל שדה מידע שנאסף בפועל בכל טופס וזרימת רכישה באתר.</span></p>
          </section>

          <section className="legal-section" id="pp-forms">
            <h2>2. מידע שנמסר בטפסים</h2>
            <p>
              טופס יצירת הקשר שבעמוד <Link href="/contact">צור קשר</Link> מבקש שם, כתובת אימייל, נושא פנייה ותוכן הודעה. נכון לרגע זה, טופס
              זה מוגדר באתר כטופס הדגמה בלבד ואינו שולח מידע בפועל.
            </p>
            <p>טופס ההרשמה לניוזלטר בעמוד הבית מבקש כתובת אימייל, וגם הוא מוגדר כרגע כהדגמה בלבד.</p>
            <p><span className="legal-tbd">להשלמה: פירוט מלא ברגע שהטפסים יחוברו לשירות אמיתי שמעבד ושומר את הנתונים.</span></p>
          </section>

          <section className="legal-section" id="pp-purchase">
            <h2>3. מידע ברכישה</h2>
            <p>המשחקים לזוגות באתר הם מוצר דיגיטלי. בעמוד הרכישה של כל משחק מתבקשת לפחות כתובת אימייל, שאליה נשלח קישור הגישה למשחק לאחר ההרשמה.</p>
            <p><span className="legal-tbd">להשלמה: פרטי מידע נוספים שייאספו בפועל בעת חיבור מערכת סליקה אמיתית (למשל שם מלא, פרטי תשלום המעובדים ישירות אצל ספק הסליקה).</span></p>
          </section>

          <section className="legal-section" id="pp-cookies">
            <h2>4. Cookies ו-Analytics</h2>
            <p><span className="legal-tbd">נכון לכתיבת מסמך זה, לא אותרו באתר כלי אנליטיקס או פרסום צד שלישי (כגון Google Analytics או פיקסלים חברתיים). אם וכאשר ייעשה שימוש בכלים כאלה, סעיף זה יעודכן בהתאם ויפרט אילו Cookies נשמרים, למה משמשים ואיך אפשר לנהל את ההעדפות.</span></p>
          </section>

          <section className="legal-section" id="pp-use">
            <h2>5. שימוש במידע</h2>
            <p>המידע הנאסף משמש, ככלל, לצרכים הבאים:</p>
            <ul>
              <li>מתן מענה לפניות שמתקבלות דרך טופס יצירת הקשר.</li>
              <li>אספקת מוצר דיגיטלי שנרכש (שליחת קישור גישה למייל).</li>
              <li>שיפור חוויית השימוש באתר.</li>
              <li>שליחת עדכונים למי שנרשם לכך מרצונו (ניוזלטר).</li>
            </ul>
            <p><span className="legal-tbd">להשלמה: פירוט מלא של כל שימוש בפועל, בהתאם למערכות שיחוברו לאתר.</span></p>
          </section>

          <section className="legal-section" id="pp-third-parties">
            <h2>6. ספקי צד שלישי</h2>
            <p>האתר עשוי להשתמש בשירותי צד שלישי לצורך תפעולו (למשל אחסון, שליחת מיילים, סליקת תשלומים או ניתוח שימוש). ספקים אלה מקבלים גישה למידע הנדרש להם בלבד לצורך מתן השירות.</p>
            <p><span className="legal-tbd">להשלמה: רשימה שמית של כל ספק צד שלישי שבו נעשה שימוש בפועל, כולל קישור למדיניות הפרטיות שלו.</span></p>
          </section>

          <section className="legal-section" id="pp-newsletter">
            <h2>7. שירות דיוור</h2>
            <p>מי שנרשם לניוזלטר מוסר את כתובת האימייל שלו לצורך קבלת עדכונים מהאתר. נכון לרגע זה טופס ההרשמה הוא הדגמה בלבד ואינו מחובר לשירות דיוור פעיל.</p>
            <p><span className="legal-tbd">להשלמה: שם שירות הדיוור שישמש בפועל, ואופן ההסרה מרשימת התפוצה.</span></p>
          </section>

          <section className="legal-section" id="pp-payments">
            <h2>8. שירותי תשלום</h2>
            <p>רכישת משחק היא בתשלום חד־פעמי. נכון לרגע זה, מנגנון הסליקה אינו מחובר באתר, ותהליך התשלום בפועל יחובר בהמשך לספק סליקה חיצוני. האתר עצמו אינו שומר פרטי כרטיס אשראי — פרטים אלה, כשיתווספו, יעובדו ישירות אצל ספק הסליקה.</p>
            <p><span className="legal-tbd">להשלמה: שם ספק הסליקה שייבחר, ופרטי מדיניות הפרטיות שלו.</span></p>
          </section>

          <section className="legal-section" id="pp-retention">
            <h2>9. שמירת מידע</h2>
            <p><span className="legal-tbd">להשלמה: משך הזמן שבו נשמר כל סוג מידע, ומדיניות המחיקה בתום התקופה הרלוונטית.</span></p>
          </section>

          <section className="legal-section" id="pp-security">
            <h2>10. אבטחה</h2>
            <p>אנו שואפים לנקוט אמצעים סבירים כדי להגן על המידע הנאסף מפני גישה, שימוש או חשיפה בלתי מורשים. עם זאת, אין אפשרות להבטיח הגנה מוחלטת על מידע המועבר או מאוחסן באמצעים דיגיטליים.</p>
            <p><span className="legal-tbd">להשלמה: פירוט אמצעי האבטחה הטכניים בפועל (הצפנה, גיבויים וכדומה) לאחר סגירת הארכיטקטורה הסופית.</span></p>
          </section>

          <section className="legal-section" id="pp-rights">
            <h2>11. זכויות המשתמש</h2>
            <p>בכפוף לדין החל, ייתכן שיש למשתמשים זכות לבקש עיון במידע שנשמר עליהם, תיקון שלו, מחיקתו, או הסרה מרשימת תפוצה. ניתן להגיש בקשה כזו דרך פרטי יצירת הקשר המפורטים בסעיף הבא.</p>
            <p><span className="legal-tbd">להשלמה: הפניה מדויקת לחוק הרלוונטי (למשל חוק הגנת הפרטיות הישראלי ו/או תקנות רלוונטיות נוספות) לאחר ייעוץ משפטי.</span></p>
          </section>

          <section className="legal-section" id="pp-contact">
            <h2>12. יצירת קשר</h2>
            <p>
              שאלות בנוגע למדיניות פרטיות זו ניתן להפנות במייל <a href="mailto:rotemadini@gmail.com">rotemadini@gmail.com</a> או דרך עמוד{" "}
              <Link href="/contact">צור קשר</Link>.
            </p>
            <p><span className="legal-tbd">להשלמה: פרטי החברה/העסק המלאים (שם משפטי, מספר עוסק/ח.פ., כתובת) יתווספו כאן.</span></p>
          </section>

          <section className="legal-section" id="pp-changes">
            <h2>13. שינויים במדיניות</h2>
            <p>מדיניות זו עשויה להתעדכן מעת לעת, בין היתר בהתאם לשינויים בשירותים המחוברים לאתר או בדרישות הדין. המשך השימוש באתר לאחר פרסום עדכון מהווה הסכמה לתנאים המעודכנים. מומלץ לבקר בעמוד זה מדי פעם.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
