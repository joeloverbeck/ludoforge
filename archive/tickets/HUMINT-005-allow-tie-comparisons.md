# HUMINT-005: Allow tie responses in pairwise comparison prompts
Status: Completed

## Context
Preference feedback supports tie outcomes, but the human interface prompt only accepted A/B responses. That forced a winner even when a user had no preference.

## Scope
- Extend `promptForPairwiseComparison` to accept tie responses.
- Update types and tests to cover tie handling.
- Keep behavior compatible with existing A/B responses.

## Out of scope
- No persistence changes.
- No changes to preference model training logic.

## Outcome
- Updated `promptForPairwiseComparison` to accept "tie"/"t" input and adjusted messaging.
- Expanded comparison feedback type to allow tie.
- Added a test covering tie responses in the prompt.
