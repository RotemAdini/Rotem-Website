import type { DatePlan } from "@/lib/types";

/** The "cost / how long / how much effort, what you need, what to prep
 * ahead, what you actually do" panel on a date's detail page. Rendered only
 * when the item has plan data — matches the original's hidden `#datePlanSection`. */
export default function DatePlanPanel({ plan }: { plan: DatePlan }) {
  return (
    <section className="container recipe-content-grid" id="datePlanSection">
      <aside className="ingredients-card panel">
        <span className="section-kicker">מה זה עולה</span>
        <h2>פרטי הדייט</h2>
        <div className="recipe-stats">
          {plan.cost && (
            <div>
              <strong>{plan.cost}</strong>
              <span>עלות</span>
            </div>
          )}
          {plan.duration && (
            <div>
              <strong>{plan.duration}</strong>
              <span>משך זמן</span>
            </div>
          )}
          {plan.effort && (
            <div>
              <strong>{plan.effort}/10</strong>
              <span>רמת השקעה</span>
            </div>
          )}
        </div>
        <h3>מה צריך</h3>
        {plan.needed?.length ? (
          plan.needed.map((line, index) => (
            <label className="ingredient-check" key={index}>
              <input type="checkbox" />
              <span>{line}</span>
            </label>
          ))
        ) : (
          <p>אין רשימה זמינה.</p>
        )}
        <h3>מה מכינים מראש</h3>
        {plan.prepAhead?.length ? (
          plan.prepAhead.map((line, index) => (
            <label className="ingredient-check" key={index}>
              <input type="checkbox" />
              <span>{line}</span>
            </label>
          ))
        ) : (
          <p>אין הכנה מיוחדת מראש.</p>
        )}
      </aside>
      <article className="instructions-card panel">
        <span className="section-kicker">איך זה עובד</span>
        <h2>מה עושים בדייט</h2>
        <p>{plan.whatYouDo || ""}</p>
        {plan.note && (
          <div className="tip-box">
            <strong>הערה של רותם</strong>
            <p>{plan.note}</p>
          </div>
        )}
      </article>
    </section>
  );
}
