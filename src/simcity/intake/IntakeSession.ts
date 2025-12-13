import { ScenarioProposal } from "./ScenarioProposal";

export type IntakeState = "received" | "clarifying" | "proposed" | "approved";

export interface IntakeQuestion {
  id: string;
  text: string;
  category: "scope" | "duration" | "severity" | "stress" | "assumptions";
}

export interface IntakeAnswer {
  questionId: string;
  answer: string;
}

export class IntakeSession {
  readonly id: string;
  readonly rawInput: string;
  private state: IntakeState = "received";
  private questions: IntakeQuestion[] = [];
  private answers: IntakeAnswer[] = [];
  private proposals: ScenarioProposal[] = [];

  constructor(id: string, rawInput: string) {
    this.id = id;
    this.rawInput = rawInput;
  }

  getState(): IntakeState {
    return this.state;
  }

  setClarifyingQuestions(questions: IntakeQuestion[]): void {
    this.state = "clarifying";
    this.questions = questions;
  }

  recordAnswer(answer: IntakeAnswer): void {
    this.answers = this.answers.filter((a) => a.questionId !== answer.questionId).concat(answer);
  }

  getOutstandingQuestions(): IntakeQuestion[] {
    return this.questions.filter((question) => !this.answers.find((a) => a.questionId === question.id));
  }

  setProposals(proposals: ScenarioProposal[]): void {
    this.proposals = proposals;
    this.state = "proposed";
  }

  approveProposal(id: string): ScenarioProposal | null {
    const proposal = this.proposals.find((p) => p.id === id) || null;
    if (proposal) {
      this.state = "approved";
    }
    return proposal;
  }

  getAnswers(): IntakeAnswer[] {
    return this.answers;
  }

  getProposals(): ScenarioProposal[] {
    return this.proposals;
  }
}
