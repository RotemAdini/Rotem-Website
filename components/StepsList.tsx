import { classifyInstructionLines } from "@/lib/recipe-text";

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

  // Classification and step numbering both live in lib/recipe-text.ts now, so
  // the numbers here count only real cooking steps — section labels and
  // nutrition lines no longer take a number on the way past.
  const lines = classifyInstructionLines(instructions);

  return (
    <ol className="steps-list">
      {lines.map(({ text, kind, stepNumber, display }, index) => {
        if (kind === "nutrition-heading") {
          return (
            <li className="instruction-nutrition-heading" key={index}>
              <h3>{text}</h3>
            </li>
          );
        }
        if (kind === "heading") {
          return (
            <li className="instruction-section-heading" key={index}>
              <h3>{text}</h3>
            </li>
          );
        }
        if (kind === "nutrition" || kind === "note") {
          return (
            <li className={`instruction-${kind}`} key={index}>
              <p>{text}</p>
            </li>
          );
        }
        return (
          <li key={index}>
            <span className="step-number">{stepNumber}</span>
            <div>
              <h3>שלב {stepNumber}</h3>
              <p>{display}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
