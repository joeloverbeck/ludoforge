# Human Interaction Interface Spec

## Purpose
Provide a generic, text-based interface for humans to play any DSL-defined game and submit feedback or preferences.

## Responsibilities
- Render state and available actions per turn in readable text.
- Accept user input to select actions.
- Support mixed human/AI agents.
- Collect ratings or pairwise preferences after play sessions.
- Support multiple human participants by alternating prompts when configured.

## MVP UI Flow
- Display turn number, active player, key variables, zone contents.
- List legal actions with numeric choices.
- Accept input and execute through kernel.
- At end, prompt for rating or pairwise comparison.

## Pairwise Comparison Flow
- Option A: Play two short sessions back-to-back, then choose A vs B.
- Option B: Show two compact game summaries (key stats, outcome, length) and choose A vs B.
- Record the choice plus optional tags/reasons.

## State Summarization
- Show public state first; show private zones only to the active human.
- Collapse large zones (e.g., top N items + counts).
- Highlight deltas since last turn (changed variables, moved tokens).

## Feedback Modes
- Single-game rating (1-5 scale).
- Pairwise preference (A vs B).
- Optional tags/reasons ("too random", "too long").

## Interfaces
- Input: game definition, kernel state stream.
- Output: action selection, feedback records.

## Open Questions
- CLI vs simple web UI for MVP (Node-first).
- How to summarize large state for readability.
