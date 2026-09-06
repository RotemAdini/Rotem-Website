import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/legal-pages.css";

export const metadata: Metadata = {
  title: "תנאי שימוש | רותם עדיני",
  description: "תנאי השימוש באתר רותם עדיני — שימוש בתכנים, מתכונים, משחקים דיגיטליים, רכישות וזכויות יוצרים.",
};

export default function TermsPage() {
  return (
    <main className="page-main page-terms">
      <section className="page-hero">
        <div className="container simple-hero">
          <span className="eyebrow">כדאי להכיר לפני שמשתמשים</span>
          <h1>
            תנאי שימוש <span>♡</span>
          </h1>
          <p>התנאים להשתמשות באתר, בתכנים ובמשחקים הדיגיטליים של רותם עדיני.</p>
        </div>
      </section>

      <div className="container legal-shell">
        <nav className="legal-toc" aria-label="ניווט מהיר בין סעיפי התנאים">
          <h2>תוכן העניינים</h2>
          <ol>
            <li><a href="#tou-general">כללי שימוש באתר</a></li>
            <li><a href="#tou-content">שימוש בתכנים וזכויות יוצרים</a></li>
            <li><a href="#tou-recipes">מתכונים ותוכן</a></li>
            <li><a href="#tou-digital">מוצרים דיגיטליים</a></li>
            <li><a href="#tou-purchase">רכישות ותשלום</a></li>
            <li><a href="#tou-delivery">אספקת מוצרים דיגיטליים</a></li>
            <li><a href="#tou-cancellation">ביטולים והחזרים</a></li>
            <li><a href="#tou-personal-use">שימוש אישי במשחקים</a></li>
            <li><a href="#tou-no-copy">איסור העתקה והפצה מסחרית</a></li>
            <li><a href="#tou-links">קישורים ושירותי צד שלישי</a></li>
            <li><a href="#tou-liability">הגבלת אחריות</a></li>
            <li><a href="#tou-changes">שינויים באתר ובתנאים</a></li>
            <li><a href="#tou-contact">יצירת קשר</a></li>
          </ol>
        </nav>

        <div className="legal-content">
          <p className="legal-updated">עדכון אחרון: 5 בספטמבר 2026</p>
          <div className="legal-draft-note">
            <span>✎</span>
            <p>מסמך זה הוא שלד ראשוני של תנאי שימוש. סעיפים שדורשים ניסוח משפטי סופי, פרטי עסק מחייבים או ייעוץ משפטי מסומנים בהתאם, ויושלמו לפני שהתנאים ייכנסו לתוקף מחייב.</p>
          </div>

          <section className="legal-section" id="tou-general">
            <h2>1. כללי שימוש באתר</h2>
            <p>הגלישה והשימוש באתר זה כפופים לתנאים המפורטים במסמך זה. אם אינכם מסכימים לתנאי מהתנאים, נא להימנע מהמשך השימוש באתר.</p>
            <p><span className="legal-tbd">להשלמה: שם העסק/החברה המפעילים את האתר, ופרטים מזהים נוספים (למשל מספר עוסק/ח.פ.).</span></p>
          </section>

          <section className="legal-section" id="tou-content">
            <h2>2. שימוש בתכנים וזכויות יוצרים</h2>
            <p>כל התכנים באתר — לרבות טקסטים, תמונות, מתכונים, עיצוב, לוגו ותוכן המשחקים — שייכים לרותם עדיני או מוצגים ברישיון, ומוגנים בזכויות יוצרים ובקניין רוחני. אין להעתיק, לשכפל, להפיץ מחדש או לעשות שימוש מסחרי בתכנים אלה ללא אישור מראש ובכתב.</p>
          </section>

          <section className="legal-section" id="tou-recipes">
            <h2>3. מתכונים ותוכן</h2>
            <p>
              המתכונים המתפרסמים באתר ניתנים לשימוש אישי וביתי חופשי. המידע מוצג למיטב הידיעה, אך ייתכנו אי־דיוקים או השמטות מזדמנות (כמות, זמן
              הכנה וכדומה); אם נתקלתם בכאלה, נשמח לדעת דרך <Link href="/contact">צור קשר</Link>.
            </p>
            <p><span className="legal-tbd">להשלמה: הבהרה לגבי אחריות לתוצאות בישול/אלרגנים, אם נדרשת.</span></p>
          </section>

          <section className="legal-section" id="tou-digital">
            <h2>4. מוצרים דיגיטליים</h2>
            <p>המשחקים לזוגות המוצעים באתר הם מוצר דיגיטלי בלבד. אין מדובר במוצר פיזי, ואין משלוח בדואר או כל אמצעי הובלה אחר.</p>
          </section>

          <section className="legal-section" id="tou-purchase">
            <h2>5. רכישות ותשלום</h2>
            <p>רכישת משחק כרוכה בתשלום חד־פעמי המקנה גישה לתוכן שנרכש. נכון לרגע זה מנגנון הסליקה באתר אינו מחובר לספק תשלומים פעיל.</p>
            <p><span className="legal-tbd">להשלמה: אמצעי התשלום הנתמכים וספק הסליקה, לאחר חיבורם בפועל.</span></p>
          </section>

          <section className="legal-section" id="tou-delivery">
            <h2>6. אספקת מוצרים דיגיטליים</h2>
            <p>לאחר השלמת ההרשמה לרכישה, נשלח לכתובת האימייל שסופקה קישור לגישה מיידית למשחק שנרכש. אין צורך להוריד או להדפיס דבר — הגישה מתבצעת ישירות דרך הקישור והדפדפן.</p>
          </section>

          <section className="legal-section" id="tou-cancellation">
            <h2>7. ביטולים והחזרים</h2>
            <p>בהתאם לחוק הגנת הצרכן הישראלי, מוצר דיגיטלי המסופק מיידית ואוטומטית אינו ניתן לביטול או להחזר לאחר הרכישה.</p>
            <p><span className="legal-tbd">להשלמה: ניסוח מלא של נוהל ביטול עסקה (במקרים המותרים בדין) ואופן הגשת בקשה כזו, בכפוף לייעוץ משפטי.</span></p>
          </section>

          <section className="legal-section" id="tou-personal-use">
            <h2>8. שימוש אישי במשחקים</h2>
            <p>משחק שנרכש מיועד לשימוש אישי של הרוכש/ת ובן/בת הזוג בלבד, לצורך הנאה פרטית. הגישה ניתנת לכל החיים לתוכן שנרכש.</p>
          </section>

          <section className="legal-section" id="tou-no-copy">
            <h2>9. איסור העתקה והפצה מסחרית</h2>
            <p>אין להעתיק, לשתף, למכור, להשכיר, להעלות לפלטפורמות אחרות או להפיץ בכל דרך אחרת — מסחרית או שאינה מסחרית — את תוכן המשחקים או כל חלק ממנו, ללא אישור מראש ובכתב.</p>
          </section>

          <section className="legal-section" id="tou-links">
            <h2>10. קישורים ושירותי צד שלישי</h2>
            <p>האתר עשוי לכלול קישורים לאתרים ושירותים חיצוניים (לדוגמה רשתות חברתיות). קישורים אלה מובאים לנוחות המשתמש בלבד, ואין לרותם עדיני שליטה או אחריות על תוכן או מדיניות הפרטיות של אתרי צד שלישי.</p>
          </section>

          <section className="legal-section" id="tou-liability">
            <h2>11. הגבלת אחריות</h2>
            <p>התכנים והשירותים באתר ניתנים כפי שהם (&quot;as is&quot;), ללא התחייבות לזמינות רציפה או להיעדר תקלות. השימוש באתר ובתכניו הוא באחריות המשתמש/ת.</p>
            <p><span className="legal-tbd">להשלמה: ניסוח משפטי סופי של סעיף הגבלת האחריות, בכפוף לייעוץ משפטי ולדין החל.</span></p>
          </section>

          <section className="legal-section" id="tou-changes">
            <h2>12. שינויים באתר ובתנאים</h2>
            <p>ייתכנו שינויים בתוכן האתר, במוצרים המוצעים ובתנאי שימוש אלה מעת לעת, ללא הודעה מוקדמת. המשך השימוש באתר לאחר עדכון התנאים מהווה הסכמה לנוסח המעודכן.</p>
          </section>

          <section className="legal-section" id="tou-contact">
            <h2>13. יצירת קשר</h2>
            <p>
              לשאלות בנוגע לתנאי השימוש ניתן לפנות במייל <a href="mailto:hello@rotemadini.com">hello@rotemadini.com</a> או דרך עמוד{" "}
              <Link href="/contact">צור קשר</Link>.
            </p>
            <p><span className="legal-tbd">להשלמה: דין חל וסמכות שיפוט ייחודית (לאחר קביעה משפטית), ופרטי העסק המלאים.</span></p>
          </section>
        </div>
      </div>
    </main>
  );
}
