import { IntakeQuestion, IntakeSession } from "./IntakeSession";

interface Ambiguity {
  category: IntakeQuestion["category"];
  reason: string;
  question: string;
}

const QUESTION_BANK: Ambiguity[] = [
  {
    category: "duration",
    reason: "No duration specified",
    question: "Over what period should this play out (hours, days, weeks)?",
  },
  {
    category: "scope",
    reason: "No scope specified",
    question: "Is this localized to one market/provider group or global?",
  },
  {
    category: "severity",
    reason: "No severity specified",
    question: "What severity do you want to explore (mild, major, catastrophic)?",
  },
  {
    category: "stress",
    reason: "Stress vector ambiguous",
    question: "Which stress vectors matter most (demand, supply, payments, trust, latency)?",
  },
  {
    category: "assumptions",
    reason: "Intervention assumptions unclear",
    question: "Should pricing and ops remain frozen, or are interventions allowed?",
  },
];

function needsCategory(input: string, category: IntakeQuestion["category"]): boolean {
  const text = input.toLowerCase();
  if (category === "duration") return !/(hour|day|week|month|duration)/.test(text);
  if (category === "scope") return !/(global|local|market|region|provider)/.test(text);
  if (category === "severity") return !/(mild|major|critical|catastrophic|sev)/.test(text);
  if (category === "stress") return !/(demand|supply|provider|latency|trust|payment|fraud|queue)/.test(text);
  if (category === "assumptions") return !/(freeze|no intervention|intervention|fixed pricing)/.test(text);
  return true;
}

export class ClarificationEngine {
  evaluate(session: IntakeSession): IntakeQuestion[] {
    const input = session.rawInput;
    const existingQuestions = session.getOutstandingQuestions();
    const missing = QUESTION_BANK.filter((ambiguity) => needsCategory(input, ambiguity.category));

    const questions: IntakeQuestion[] = missing.map((item, index) => ({
      id: `${item.category}-${index}`,
      text: item.question,
      category: item.category,
    }));

    // ensure we don't duplicate questions already asked
    const outstandingIds = new Set(existingQuestions.map((q) => q.id));
    return questions.filter((q) => !outstandingIds.has(q.id));
  }
}
