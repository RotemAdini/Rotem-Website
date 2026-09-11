import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/legal-pages.css";

export const metadata: Metadata = {
  title: "שאלות ותשובות | רותם עדיני",
  description: "תשובות לשאלות נפוצות על מתכונים, משחקים לזוגות ורכישה באתר של רותם עדיני.",
};

export default function FaqPage() {
  return (
    <main className="page-main page-faq">
      <section className="page-hero">
        <div className="container simple-hero">
          <span className="eyebrow">כאן כדי לעזור</span>
          <h1>
            שאלות ותשובות <span>♡</span>
          </h1>
          <p>
            כל מה שרציתם לדעת על המתכונים, המשחקים לזוגות ואיך הרכישה עובדת. לא מצאתם תשובה? אפשר תמיד{" "}
            <Link href="/contact">לכתוב לי</Link>.
          </p>
        </div>
      </section>

      <div className="container legal-shell">
        <nav className="legal-toc" aria-label="ניווט מהיר בין נושאי השאלות">
          <h2>קפצו לנושא</h2>
          <ol>
            <li>
              <a href="#faq-recipes">מתכונים</a>
            </li>
            <li>
              <a href="#faq-games">משחקים לזוגות</a>
            </li>
            <li>
              <a href="#faq-purchase">רכישה</a>
            </li>
          </ol>
        </nav>

        <div className="legal-content">
          <section className="faq-category" id="faq-recipes" aria-labelledby="faq-recipes-h">
            <h2 id="faq-recipes-h">
              <span className="icon">🍳</span> מתכונים
            </h2>
            <div className="faq-list">
              <details className="faq-item">
                <summary>
                  האם השימוש במתכונים באתר חינם?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>כן. כל המתכונים המפורסמים באתר פתוחים לצפייה וללא עלות — אין צורך לשלם או להירשם כדי לקרוא אותם ולהכין אותם בבית.</p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  איך מחפשים מתכון?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>
                    הדרך הכי מהירה היא דרך סמל החיפוש (⌕) בתפריט העליון, שם אפשר להקליד שם מנה, מרכיב או מילת מפתח. אפשר גם לגלוש בעמוד{" "}
                    <Link href="/recipes">כל המתכונים</Link> ולדפדף בין הכרטיסים.
                  </p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  איך משתמשים בקטגוריות ובסינון?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>
                    בעמוד <Link href="/recipes">המתכונים</Link> יש אפשרויות סינון וקטגוריות שמאפשרות לצמצם את הרשימה — למשל לפי סוג ארוחה או
                    נושא. בוחרים את הסינון הרלוונטי והרשימה מתעדכנת בהתאם.
                  </p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  מה עושים אם חסר מידע במתכון?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>
                    קורה, וזה עוזר לי מאוד לדעת על זה. אם שמתם לב שחסר פרט, כמות או שלב בהכנה — אשמח שתכתבו לי דרך עמוד{" "}
                    <Link href="/contact">צור קשר</Link> עם שם המתכון, ואשלים או אתקן את החסר בהקדם.
                  </p>
                </div>
              </details>
            </div>
          </section>

          <section className="faq-category" id="faq-games" aria-labelledby="faq-games-h">
            <h2 id="faq-games-h">
              <span className="icon">🎲</span> משחקים לזוגות
            </h2>
            <div className="faq-list">
              <details className="faq-item">
                <summary>
                  מהם המשחקים?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>
                    אלו משחקים דיגיטליים לזוגות שנועדו להעביר ערב אחר ביחד — משימות, שאלות ורגעים שמצחיקים, מתחרים או פותחים שיחה. אפשר לראות
                    את כל האפשרויות בעמוד <Link href="/games">משחקים</Link>.
                  </p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  האם מדובר במוצר דיגיטלי?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>כן. כל המשחקים הם מוצר דיגיטלי בלבד — אין משלוח פיזי ואין קופסת משחק שמגיעה בדואר.</p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  איך מקבלים את המשחק לאחר הרכישה?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>
                    הרכישה המקוונת עדיין לא נפתחה — מנגנון הסליקה באתר בהקמה. בינתיים אפשר להשאיר פרטים בעמוד של
                    כל משחק, ונשלח לכם מייל עם קישור לגישה ברגע שאפשר יהיה לרכוש.
                  </p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  האם צריך להדפיס?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>לא, אין צורך להוריד או להדפיס דבר. המשחק נגיש דרך הקישור שנשלח למייל, ישירות מהדפדפן.</p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  למי המשחקים מתאימים?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>המשחקים בנויים לזוגות — בין אם רק התחלתם לצאת, זוג ותיק שרוצה לשבור שגרה, או פשוט שני אנשים שרוצים ערב קליל וכיפי ביחד.</p>
                  <p>
                    <span className="legal-tbd">להשלמה: המלצת גיל/תוכן מפורשת לכל משחק, אם רלוונטית.</span>
                  </p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  האם ניתן להשתמש במשחק יותר מפעם אחת?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>מדובר ברכישה חד־פעמית עם גישה לכל החיים לתוכן שנרכש, כך שאפשר לחזור אליו שוב ושוב מתי שרוצים.</p>
                </div>
              </details>
            </div>
          </section>

          <section className="faq-category" id="faq-purchase" aria-labelledby="faq-purchase-h">
            <h2 id="faq-purchase-h">
              <span className="icon">💳</span> רכישה
            </h2>
            <div className="faq-list">
              <details className="faq-item">
                <summary>
                  מהם זמני האספקה?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>מכיוון שמדובר במוצר דיגיטלי, האספקה אמורה להיות מיידית דרך מייל לאחר השלמת הרכישה.</p>
                  <p>
                    <span className="legal-tbd">להשלמה: אישור סופי של זמן האספקה בפועל לאחר חיבור מערכת הסליקה.</span>
                  </p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  מהי מדיניות ההחזרים?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>בהתאם לחוק הגנת הצרכן הישראלי, מוצר דיגיטלי המסופק מיידית ואוטומטית אינו ניתן לביטול או להחזר לאחר הרכישה.</p>
                  <p>
                    <span className="legal-tbd">להשלמה: מקרים חריגים (למשל תקלה טכנית במסירת הקישור) ואופן הטיפול בהם.</span>
                  </p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  איך מבטלים רכישה?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>
                    <span className="legal-tbd">להשלמה: נוהל ביטול עסקה מפורט, בהתאם לתנאי השימוש הסופיים ולחוק הגנת הצרכן.</span> עד
                    להשלמת הנוהל, אפשר לפנות דרך <Link href="/contact">צור קשר</Link> בכל שאלה על רכישה.
                  </p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  אילו אמצעי תשלום ניתן להשתמש בהם?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>
                    <span className="legal-tbd">להשלמה: אמצעי התשלום הנתמכים יפורטו כאן לאחר חיבור מערכת הסליקה בפועל.</span>
                  </p>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  מה עושים אם יש בעיה או שאלה אחרי הרכישה?<span className="faq-plus">+</span>
                </summary>
                <div className="faq-answer">
                  <p>
                    אפשר לפנות בכל שלב דרך עמוד <Link href="/contact">צור קשר</Link> או במייל{" "}
                    <a href="mailto:rotemadini@gmail.com">rotemadini@gmail.com</a>, ואשמח לעזור.
                  </p>
                </div>
              </details>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
