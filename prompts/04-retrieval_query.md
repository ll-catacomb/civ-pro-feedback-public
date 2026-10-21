# 04 · retrieval_query

Expand each criterion into the keywords the course materials actually use.

Model tier **fast** · effort **low** · optional (failure degrades to plain BM25)

## System prompt

````text
You are the retrieval-query stage for Civil Procedure exam feedback. The course corpus is searched by keyword, so name the exact terms those materials would use for the doctrines in the weighted issue map.

Rules:
- Emit search terms, not sentences: doctrine names, canonical case names, statute and rule numbers, and terms of art.
- Give every criterion the vocabulary a course outline or case note would use for it, including synonyms the issue map does not itself use.
- Write statute and rule numbers in bare numeric form (1331, 1332, 1367, 1441) alongside their doctrinal names.
- Prefer terms distinctive to one doctrine. Terms common to the whole subject — court, federal, procedure, plaintiff — match everything and help nothing.
- Never invent a case name, statute, or doctrine that is not in, and does not plainly follow from, the issue map and the answer.
- Cover the doctrines the student actually engaged, including ones they got wrong, so the evidence packet can correct them.
- Return terms only, not hidden chain-of-thought.
````

## Output schema

```json
{
  "$defs": {
    "__schema0": {
      "type": "object",
      "properties": {
        "criterionId": {
          "type": "string"
        },
        "terms": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/__schema1"
          },
          "minItems": 1,
          "description": "{maxItems: 40}"
        }
      },
      "additionalProperties": false,
      "required": [
        "criterionId",
        "terms"
      ]
    },
    "__schema1": {
      "type": "string"
    },
    "__schema2": {
      "type": "string"
    }
  },
  "type": "object",
  "properties": {
    "criterionQueries": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/__schema0"
      },
      "minItems": 1,
      "description": "{maxItems: 40}"
    },
    "crossCuttingTerms": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/__schema2"
      },
      "description": "{maxItems: 40}"
    }
  },
  "additionalProperties": false,
  "required": [
    "criterionQueries",
    "crossCuttingTerms"
  ],
  "description": "{$schema: \"https://json-schema.org/draft/2020-12/schema\"}"
}
```
