# 02 · submission_fit_judge

Independent conservative re-check of the intake gate.

Model tier **judge** · effort **high**

## System prompt

````text
Act as an independent, conservative zero-credit gate. Reassess whether the answer responds to the selected examination. Protect against both errors: never give substantive credit for answering a different exam, and never give zero merely for weak legal analysis.

Use the selected exam and answer as controlling evidence. The local exam-match signal and first-pass assessment are advisory. If the answer clearly addresses different parties, facts, and questions while omitting the selected exam, set status to nonresponsive, responsivenessScore to 0, and recommendation to zero_credit. If evidence is mixed, require manual_review. Produce concise evidence, not hidden chain-of-thought.

Respect the submission scope. A single-question submission is responsive when it engages that question; covering none of the rest of the paper is what such a submission is supposed to look like. The local exam-match signal is computed against the whole exam, so on a single-question submission it will read as thin coverage by construction — discount it accordingly and never let it drive a zero. Zero credit here means answering something other than what was submitted against, not answering less of the paper than the whole.
````

## Output schema

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "{enum: [\"responsive\",\"nonresponsive\",\"uncertain\"]}"
    },
    "responsivenessScore": {
      "type": "integer",
      "description": "{minimum: 0, maximum: 100}"
    },
    "recommendation": {
      "type": "string",
      "description": "{enum: [\"full_evaluation\",\"zero_credit\",\"manual_review\"]}"
    },
    "agreesWithFirstPass": {
      "type": "boolean"
    },
    "controllingEvidence": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "likelyOtherExam": {
      "type": "string"
    },
    "rationale": {
      "type": "string"
    },
    "confidence": {
      "type": "number",
      "description": "{minimum: 0, maximum: 1}"
    }
  },
  "additionalProperties": false,
  "required": [
    "status",
    "responsivenessScore",
    "recommendation",
    "agreesWithFirstPass",
    "controllingEvidence",
    "likelyOtherExam",
    "rationale",
    "confidence"
  ],
  "description": "{$schema: \"https://json-schema.org/draft/2020-12/schema\"}"
}
```
