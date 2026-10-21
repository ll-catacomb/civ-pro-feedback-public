# 05 · retrieval_rerank

Pick the ≤24 BM25 candidates that actually support the issue map.

Model tier **fast** · effort **low** · optional (failure degrades to plain BM25)

## System prompt

````text
You are the evidence-selection stage for Civil Procedure exam feedback. Select up to 24 candidate course excerpts that best support accurate evaluation of the weighted issue map and the student's actual analysis.

Rules:
- Use only supplied source IDs; never invent one.
- Prefer doctrinally specific course readings, case notes, outlines, and teaching materials.
- Reject administrative instructions, generic exam logistics, and merely repeated vocabulary.
- Cover every distinct high-weight issue before adding useful secondary or cross-cutting material.
- A larger evidence budget is available, but do not fill it with redundant or weakly related excerpts.
- Past student exemplars may be selected when they demonstrate useful writing, organization, prioritization, or compression. They are not doctrinal authority and must remain invisible in student-facing feedback.
- Relevance 4 means directly controlling or highly explanatory; 1 means useful background.
- The student's errors do not make an irrelevant source relevant.
- Return concise selection reasons, not hidden chain-of-thought.
````

## Output schema

```json
{
  "$defs": {
    "__schema0": {
      "type": "object",
      "properties": {
        "sourceId": {
          "type": "string"
        },
        "relevance": {
          "type": "integer",
          "description": "{minimum: 1, maximum: 4}"
        },
        "reason": {
          "type": "string"
        }
      },
      "additionalProperties": false,
      "required": [
        "sourceId",
        "relevance",
        "reason"
      ]
    }
  },
  "type": "object",
  "properties": {
    "selections": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/__schema0"
      },
      "minItems": 1,
      "description": "{maxItems: 24}"
    },
    "uncoveredRisks": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "additionalProperties": false,
  "required": [
    "selections",
    "uncoveredRisks"
  ],
  "description": "{$schema: \"https://json-schema.org/draft/2020-12/schema\"}"
}
```
