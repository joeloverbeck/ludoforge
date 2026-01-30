This is the shortlist of the first working evolutionary run in our app:

[
  {
    "id": "genome-c57bace84a4a0eb316a26f96f3a7436b01e55e8167529b033a7e9c791a656e10",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "var_0",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "var_1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "var_2",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 20
            },
            "initial": 0
          }
        ]
      },
      "actions": [
        {
          "id": "action_0",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "var_0"
              },
              "amount": 1
            }
          ],
          "preconditions": {
            "kind": "cmp",
            "op": "<",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "var_0"
              }
            },
            "right": {
              "kind": "value",
              "value": 15
            }
          }
        },
        {
          "id": "action_1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "var_1"
              },
              "amount": 1
            }
          ],
          "preconditions": {
            "kind": "cmp",
            "op": ">",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "var_1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "action_2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "var_2"
              },
              "value": 12
            }
          ]
        },
        {
          "id": "action_3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "var_1"
              },
              "value": 6
            }
          ]
        }
      ],
      "turn": {
        "scheduler": "round_robin"
      },
      "termination": {
        "conditions": [
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_0"
                }
              },
              "right": {
                "kind": "value",
                "value": 15
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          },
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_1"
                }
              },
              "right": {
                "kind": "value",
                "value": 15
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          },
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_2"
                }
              },
              "right": {
                "kind": "value",
                "value": 20
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 29
      }
    }
  },
  {
    "id": "genome-a398e082261b149e86cc02b0d00b2fcced21605da78fbf0744d4af058b3b6ce1",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "var_0",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "var_1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 16
            },
            "initial": 0
          }
        ]
      },
      "actions": [
        {
          "id": "action_0",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "var_0"
              },
              "amount": 1
            },
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "var_1"
              },
              "amount": 3
            }
          ],
          "preconditions": {
            "kind": "and",
            "left": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_0"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            },
            "right": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          }
        }
      ],
      "turn": {
        "scheduler": "round_robin"
      },
      "termination": {
        "conditions": [
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_0"
                }
              },
              "right": {
                "kind": "value",
                "value": 15
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          },
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_1"
                }
              },
              "right": {
                "kind": "value",
                "value": 16
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 42
      }
    }
  },
  {
    "id": "genome-d82d21b2b58ab8ebe570c0481f2094f49a5ffd31e783c7d31167a86d5eaf6a33",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "var_0",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 0
          },
          {
            "id": "var_1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 9
            },
            "initial": 0
          }
        ]
      },
      "actions": [
        {
          "id": "action_0",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "var_0"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "cmp",
            "op": "<",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "var_0"
              }
            },
            "right": {
              "kind": "value",
              "value": 4
            }
          }
        },
        {
          "id": "action_1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "var_1"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "cmp",
            "op": ">",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "var_1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "action_2",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "var_1"
              },
              "amount": 3
            }
          ],
          "preconditions": {
            "kind": "cmp",
            "op": ">",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "var_1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "action_3",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "var_0"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "cmp",
            "op": ">",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "var_0"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        }
      ],
      "turn": {
        "scheduler": "round_robin"
      },
      "termination": {
        "conditions": [
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_0"
                }
              },
              "right": {
                "kind": "value",
                "value": 4
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          },
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_1"
                }
              },
              "right": {
                "kind": "value",
                "value": 9
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 86
      }
    }
  },
  {
    "id": "genome-6f66fda4ac52a4475c1d6fbbb620402d61a409dadb210dd1f07c2a7d4a718a73",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 3
      },
      "state": {
        "variables": [
          {
            "id": "var_0",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 0
          }
        ]
      },
      "actions": [
        {
          "id": "action_0",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "var_0"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "cmp",
            "op": ">",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "var_0"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "action_1",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "var_0"
              },
              "value": 2
            }
          ]
        }
      ],
      "turn": {
        "scheduler": "round_robin"
      },
      "termination": {
        "conditions": [
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "var_0"
                }
              },
              "right": {
                "kind": "value",
                "value": 4
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 58
      }
    }
  }
]


---

I asked ChatGPT to explain the generated games to me. It said:

1) genome-c57b… (2 players, 3 global counters)
# Setup

var_0: 0 → 15 (starts 0)

var_1: 0 → 15 (starts 0)

var_2: 0 → 20 (starts 0)

# Turn structure

Players alternate turns. On your turn you pick one action.

# Actions

action_0: var_0 += 1 (only if var_0 < 15)

action_1: var_1 -= 1 (only if var_1 > 0)

action_2: var_2 = 12 (always legal)

action_3: var_1 = 6 (always legal)

# Win conditions

You win immediately if, after your action:

var_0 >= 15 or

var_1 >= 15 or

var_2 >= 20

Max turns: 29 (but your schema doesn’t say what happens on timeout: draw? no-winner?).

# What this “game” really is

Only var_0 can actually reach its win threshold.

var_1 can never go up to 15 (it only gets set to 6 or decreased).

var_2 can never reach 20 (it only gets set to 12).

So the entire game is: increment the shared global var_0 to 15, and whoever performs the increment that makes it hit 15 wins.

# Strategy (and why it’s degenerate)

Because var_0 is global/shared, you’re basically fighting over who gets the “last hit” at var_0 = 14 → 15.

The “set” actions (action_2, action_3) are basically “waste a turn” buttons.

This becomes a parity/tempo contest: players may waste turns to try to be the one who performs the 15th increment.

If both players can always waste, it can also drift toward timeout if they play chicken.

2) genome-a398… (2 players, 2 global counters) — dead on arrival
# Setup

var_0: 0 → 15 (starts 0)

var_1: 0 → 16 (starts 0)

# Actions

Only one action exists:

action_0: var_0 -= 1 and var_1 -= 3
Legal only if: var_0 > 0 AND var_1 > 0

# Win conditions

Win if var_0 >= 15 or var_1 >= 16 (active player wins)

Max turns: 42

# What actually happens

Both variables start at 0.

The only action requires both to be > 0.

Therefore: no legal moves exist from turn 1.
So the game is a forced stall until maxTurns (whatever your engine defines that as).

# Also: a rules correctness bug lurking

Even if you ever reached a state with var_1 = 1 or 2, the action would try to do var_1 -= 3, which would violate the min: 0 constraint unless your engine clamps. Your precondition should be something like var_1 >= 3, not > 0.

3) genome-d82d… (2 players, 2 global counters) — a forced loss for the starting player
# Setup

var_0: 0 → 4 (starts 0)

var_1: 0 → 9 (starts 0)

# Actions

action_0: var_0 += 2 (only if var_0 < 4)

action_1: var_1 -= 2 (only if var_1 > 0)

action_2: var_1 -= 3 (only if var_1 > 0)

action_3: var_0 -= 2 (only if var_0 > 0)

# Win conditions

Win if var_0 >= 4 or var_1 >= 9

Max turns: 86

# What this “game” really is

var_1 starts at 0 and only decreases, so the var_1 >= 9 win is impossible.

So the only real win is var_0 >= 4.

From var_0 = 0, the only legal move is action_0, making var_0 = 2.

Then the opponent, with var_0 = 2, can play action_0 again to make var_0 = 4 and instantly win.

So unless your engine allows “pass” (it doesn’t appear to), this is a forced win for the second player:

P1 must play var_0: 0 → 2

P2 plays var_0: 2 → 4 and wins

That’s as deterministic and un-game-like as it gets.

4) genome-6f66… (3 players, 1 global counter) — unwinnable
# Setup

var_0: 0 → 4 (starts 0)

3 players, round-robin turns.

# Actions

action_0: var_0 -= 2 (only if var_0 > 0)

action_1: var_0 = 2 (always legal)

# Win conditions

Win if var_0 >= 4

Max turns: 58

# What actually happens

There is no way to ever increase var_0 to 4.

The only “upward-ish” thing is setting it to 2.

The other action decreases it.

So the win condition is mathematically unreachable. The “game” is just players setting it to 2 and/or reducing it back to 0 until timeout.

# Another precondition correctness note

If var_0 could ever be 1, dec by 2 would violate min: 0. Your precondition should really be var_0 >= 2 unless you clamp.

# Blunt takeaway

Out of these 4, only the first is even capable of ending in a win through play, and it’s still basically a shared counter last-hit parity game with two meaningless variables.


---

If you want to kill this entire class of junk fast, slap these degeneracy checks into your evaluator and give them brutal penalties (or outright discard):

Instant degeneracy checks (cheap, high impact)
1) No legal move from the initial state

Evaluate legalActions(state0, activePlayer).

If empty ⇒ hard fail (unless your design explicitly allows pass / stalemate rules).

This nails genome-a398… immediately.

2) Unreachable termination (static reachability sanity)

For each termination condition like var >= T:

If no action can increase that var (inc/set-to-higher), and initial < T ⇒ unreachable.

If the only sets are to values < T ⇒ unreachable.

If actions only decrease ⇒ unreachable.

This nails genome-6f66… and the var_1>=9 condition in genome-d82d… and the var_2>=20 / var_1>=15 in genome-c57b….

3) Action violates bounds unless you clamp

If an effect can drive var below min or above max from any state allowed by its preconditions, then either:

your engine clamps and this is fine, or

it’s a correctness bug and should be punished.

Example: dec 3 with precondition var > 0 and min 0 is invalid unless clamped.

4) “Single-path forced game” (no meaningful branching)

From state0, do a shallow rollout (say depth 6–10) tracking:

number of distinct reachable states

number of distinct action choices per state

If the median legal-action count is ~1 and state variety is tiny ⇒ you’ve generated a scripted conveyor belt, not a game.

Genome-d82d… is basically forced: P1 must inc, P2 wins.

5) “Last-hit on a shared counter” detector

If:

there’s a global counter with only monotone increase

a win triggers at exact threshold

both players can “waste turns” without affecting the counter meaningfully

…then you’ve built a parity chicken game. Not always worthless, but most of these are.

Genome-c57b… is exactly this.

# A strong opinion: add a static analyzer phase before simulation

You’ll save absurd compute and your evolution will converge faster because you’re not wasting generations on impossible win conditions and dead-on-arrival action sets.

Make it output structured “reasons” like:

- NO_LEGAL_ACTIONS_AT_START

- UNREACHABLE_TERMINATION_CONDITION

- BOUND_VIOLATION_POSSIBLE

- FORCED_WIN_FOR_NEXT_PLAYER

- LOW_BRANCHING_FACTOR

Then you can:

- penalize fitness

- log it for debugging your generator

- and (most importantly) mutate toward fixing the reason (e.g., if unreachable win, introduce an increasing effect on that variable, or lower threshold, etc.)

Check out your engine’s intended semantics for:

- what happens on maxTurns (draw? loss? score compare?)

- whether variables clamp on overflow/underflow

- whether “no legal moves” ends the game or passes

