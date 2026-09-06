import { getInstructionLineKind, stripRedundantStepNumber } from "@/lib/recipes";

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
  const preparedLines = instructions.map((item, index) => {
    const kind = getInstructionLineKind(item);
    const stepNumber =
      kind === "step"
        ? instructions.slice(0, index + 1).filter((line) => getInstructionLineKind(line) === "step").length
        : null;
    return { item, index, kind, stepNumber };
  });
  return (
    <ol className="steps-list">
      {preparedLines.map(({ item, index, kind, stepNumber }) => {
        if (kind === "heading") {
          return (
            <li className="instruction-section-heading" key={index}>
              <h3>{item}</h3>
            </li>
          );
        }
        if (kind === "nutrition" || kind === "note") {
          return (
            <li className={`instruction-${kind}`} key={index}>
              <p>{item}</p>
            </li>
          );
        }
        const displayNumber = stepNumber ?? 0;
        return (
          <li key={index}>
            <span className="step-number">{displayNumber}</span>
            <div>
              <h3>שלב {displayNumber}</h3>
              <p>{stripRedundantStepNumber(item, displayNumber)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
