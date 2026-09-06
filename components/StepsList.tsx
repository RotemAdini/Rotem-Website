import { stripRedundantStepNumber } from "@/lib/recipes";

export default function StepsList({ instructions }: { instructions: string[] }) {
  if (!instructions.length) {
    return (
      <ol className="steps-list">
        <li>
          <div>
            <p>אין הוראות הכנה זמינות.</p>
          </div>
        </li>
      </ol>
    );
  }
  return (
    <ol className="steps-list">
      {instructions.map((item, index) => {
        const stepNumber = index + 1;
        return (
          <li key={index}>
            <span className="step-number">{stepNumber}</span>
            <div>
              <h3>שלב {stepNumber}</h3>
              <p>{stripRedundantStepNumber(item, stepNumber)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
