import { isIngredientHeading } from "@/lib/recipes";

export default function IngredientsList({ ingredients }: { ingredients: string[] }) {
  if (!ingredients.length) return <p>אין רשימת מצרכים זמינה.</p>;
  return (
    <>
      {ingredients.map((item, index) =>
        isIngredientHeading(item) ? (
          <div className="ingredient-heading" key={index}>
            {item}
          </div>
        ) : (
          <label className="ingredient-check" key={index}>
            <input type="checkbox" />
            <span>{item}</span>
          </label>
        ),
      )}
    </>
  );
}
