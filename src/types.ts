export interface Forecast {
  id: string
  description: string
  probability: number // 0–100
}

export interface DecisionValue {
  id: string
  label: string
  weight: 'high' | 'medium' | 'low'
  notes: string
}

export interface UpdateEntry {
  id: string
  date: string
  notes: string
  updatedForecasts?: { description: string; probability: number }[]
}

export interface Resolution {
  date: string
  actualOutcome: string
  outcomeScore: number        // 1–5: quality of how things turned out
  processQualityReview: number // 1–5: retrospective view of decision process
  forecastWasCorrect: boolean
  lessonsLearned: string
}

export interface Decision {
  id: string
  title: string
  createdAt: string
  status: 'active' | 'resolved'
  tags: string[]

  // Step 1 – Frame
  description: string
  deadline?: string
  successCriteria: string

  // Step 2 – Socratic exploration
  socratic: {
    coreQuestion: string
    assumptions: string
    alternatives: string
    baseRates: string
    steelMan: string
    preMortem: string
    secondOrder: string
  }

  // Step 3 – Values
  values: DecisionValue[]

  // Step 4 – Options & forecasts
  options: string[]
  forecasts: Forecast[]

  // Step 5 – Commit
  chosenOption: string
  reasoning: string
  processQualityScore: number   // 1–5 at decision time
  processQualityNotes: string

  // Time spent on the decision process (seconds)
  durationSeconds?: number

  // Follow-up log
  updates: UpdateEntry[]

  // Resolution (when done)
  resolution?: Resolution
}
