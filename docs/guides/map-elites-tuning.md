# MAP-Elites Grid Tuning Guide

How to balance descriptor count, bin resolution, and population size for effective MAP-Elites exploration in LudoForge.

## Core Relationship

MAP-Elites places genomes into a behavioral grid. The total number of cells is the product of all bin counts:

```
total_cells = bins_1 × bins_2 × ... × bins_N
```

For uniform bins this simplifies to `bins^N` where N is the number of descriptors.

## Available Descriptors

The schema (`schemas/config/map-elites.schema.json`) defines 7 valid descriptor IDs:

| ID | Range | Meaning |
|---|---|---|
| `agency` | 0–1 | Fraction of steps with meaningful choices (>1 legal action) |
| `strategic_depth` | 0–N | Average legal actions per step (branching factor) |
| `seat_imbalance` | 0–1 | Win-rate spread between best and worst seat |
| `variety` | 0–1 | Normalized Shannon entropy of action usage |
| `pacing_tension` | 1–N | Steps per turn (gameplay density) |
| `turn_taking_rate` | 0–1 | Frequency of player transitions between steps |
| `interaction_rate` | 0–1 | Fraction of actions affecting other players |

## The Coverage Ratio

The key quality metric is how well the evolutionary budget covers the grid:

```
coverage_quality = (populationSize × generations) / total_cells
```

This gives **evaluations per cell** — roughly how many genomes compete for each niche over the full run.

### Coverage Quality Thresholds

| Evals/Cell | Quality | Description |
|---|---|---|
| < 10 | Sparse | Most cells empty or holding low-quality genomes |
| 10–50 | Borderline | Reasonable exploration, weak selection pressure |
| 50–500 | Good | Strong selection pressure, well-explored niches |
| > 500 | Diminishing returns | Budget spent on marginal improvements |

## Grid Size Reference Tables

### By Descriptor Count (5 bins each)

| Descriptors | Grid Size | Pop 16 × 10K gen | Evals/Cell |
|---|---|---|---|
| 2 | 25 | 160K | 6,400 |
| 3 | 125 | 160K | 1,280 |
| 4 | 625 | 160K | 256 |
| 5 | 3,125 | 160K | 51 |
| 6 | 15,625 | 160K | 10 |
| 7 | 78,125 | 160K | 2 |

### By Descriptor Count (3 bins each)

| Descriptors | Grid Size | Pop 16 × 10K gen | Evals/Cell |
|---|---|---|---|
| 3 | 27 | 160K | 5,926 |
| 4 | 81 | 160K | 1,975 |
| 5 | 243 | 160K | 658 |
| 6 | 729 | 160K | 219 |
| 7 | 2,187 | 160K | 73 |

## Balancing Formula

To maintain a target coverage quality when changing parameters:

```
populationSize ≥ (target_evals_per_cell × bins^num_descriptors) / generations
```

### Minimum Population Size (10K generations, target 100 evals/cell)

| Descriptors | 3 bins | 5 bins |
|---|---|---|
| 3 | 1 | 2 |
| 4 | 1 | 7 |
| 5 | 3 | 32 |
| 6 | 8 | 157 |
| 7 | 22 | 782 |

## Scaling Rules of Thumb

- **Adding a descriptor** multiplies grid size by `bins`. The cost is exponential — each new axis is progressively more expensive.
- **Reducing bins** is the cheapest way to afford more descriptors. Going from 5 → 3 bins per axis with 7 descriptors turns 78K cells into 2K.
- **Increasing population** scales linearly — you need `bins`× the population to absorb one extra descriptor at the same coverage quality.

## Descriptor Selection Guidelines

### Prefer Orthogonal Axes

Choose descriptors that are uncorrelated. Correlated axes waste cells on distinctions that don't reflect real behavioral diversity.

Likely correlated pairs to avoid stacking:
- `agency` and `variety` (more choices tends to mean more diverse action usage)
- `pacing_tension` and `turn_taking_rate` (both measure step-level temporal structure)

Example orthogonal sets:
- `agency` + `seat_imbalance` + `interaction_rate` — player choice, fairness, social dynamics
- `variety` + `strategic_depth` + `seat_imbalance` — action diversity, complexity, balance
- `agency` + `pacing_tension` + `interaction_rate` + `seat_imbalance` — broad coverage with 4 axes

### Rotating Descriptors Across Runs

Instead of using all 7 at once, run separate experiments with different descriptor subsets to explore the full behavioral space without the exponential grid cost.

## Example Configurations

### Conservative (current default)

```json
{
  "descriptors": [
    { "id": "agency", "min": 0, "max": 1, "bins": 5 },
    { "id": "variety", "min": 0, "max": 1, "bins": 5 },
    { "id": "strategic_depth", "min": 0, "max": 50, "bins": 5 },
    { "id": "interaction_rate", "min": 0, "max": 1, "bins": 5 }
  ]
}
```

Grid: 625 cells. With pop 16 × 10K gen → 256 evals/cell. Well within the good range.

### Broad Coverage (all 7, reduced bins)

```json
{
  "descriptors": [
    { "id": "agency", "min": 0, "max": 1, "bins": 3 },
    { "id": "strategic_depth", "min": 0, "max": 50, "bins": 3 },
    { "id": "seat_imbalance", "min": 0, "max": 1, "bins": 3 },
    { "id": "variety", "min": 0, "max": 1, "bins": 3 },
    { "id": "pacing_tension", "min": 1, "max": 10, "bins": 3 },
    { "id": "turn_taking_rate", "min": 0, "max": 1, "bins": 3 },
    { "id": "interaction_rate", "min": 0, "max": 1, "bins": 3 }
  ]
}
```

Grid: 2,187 cells. Requires pop ≥ 22 at 10K gen for 100 evals/cell.

### High Resolution (fewer axes, more bins)

```json
{
  "descriptors": [
    { "id": "agency", "min": 0, "max": 1, "bins": 10 },
    { "id": "seat_imbalance", "min": 0, "max": 1, "bins": 10 },
    { "id": "interaction_rate", "min": 0, "max": 1, "bins": 10 }
  ]
}
```

Grid: 1,000 cells. With pop 16 × 10K gen → 160 evals/cell. Fine-grained behavioral distinctions on 3 orthogonal axes.
