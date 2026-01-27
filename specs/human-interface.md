# Human Interaction Interface Spec

## Purpose
Provide a generic, text-based interface for humans to play any DSL-defined game and submit feedback or preferences.

## Responsibilities
- Render state and available actions per turn in readable text.
- Accept user input to select actions.
- Support mixed human/AI agents.
- Collect ratings or pairwise preferences after play sessions.

## MVP UI Flow
- Display turn number, active player, key variables, zone contents.
- List legal actions with numeric choices.
- Accept input and execute through kernel.
- At end, prompt for rating or pairwise comparison.

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
