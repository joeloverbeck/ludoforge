# Roadmap (MVP Spec Order)

## Purpose
Provide a concise, prioritized sequence for implementing the remaining specs based on current archived foundations.

## Current Foundation (Archived)
- DSL definition and schema outline.
- Game kernel execution model.
- Validation and safety invariants.
- Simulation engine.
- Evaluation and analytics.

## Priority Order
1. Data and persistence
   - Needed to store simulation runs, metrics, and feedback.
   - MVP JSONL storage unblocks later modules.

2. Evolutionary engine
   - Depends on evaluation scores and validation rules.
   - Uses metrics for fitness and diversity management.

3. Human interface
   - Depends on kernel; best after persistence to capture feedback.
   - Enables human play sessions and ratings.

4. Preference learning
   - Depends on human feedback and evaluation vectors.
   - Refines fitness after initial evaluation pipeline is stable.

## Notes
- This order is optimized for the shortest path to an end-to-end automated loop.
- UI and preference learning can be pulled earlier if human-in-the-loop becomes the immediate goal.
