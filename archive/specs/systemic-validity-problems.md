# Systemic Validity Problems in Shortlist of Genomes

We fed the following generated shortlist of genomes, best from a generation that reached generation about 24-25:

[
  {
    "id": "genome-7160f0ff9a0752df4af51680d509b6f35ff22385a2a97ab53a4cb1ccb9d7855d",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 4
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 19
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 3
            },
            "initial": 0
          },
          {
            "id": "gauge-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 11
            },
            "initial": 0
          },
          {
            "id": "meter-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 11
            },
            "initial": 0
          },
          {
            "id": "count-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 13
            },
            "initial": 0
          }
        ],
        "tokenTypes": [
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 3
                },
                "initial": 0
              }
            ],
            "id": "counter-1"
          }
        ],
        "zones": [
          {
            "tokenType": "counter-1",
            "scope": "global",
            "order": "unordered",
            "visibility": "private",
            "id": "cache-1"
          }
        ]
      },
      "actions": [
        {
          "id": "set-1",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "drain-1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          },
          "costs": []
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          },
          "costs": []
        },
        {
          "id": "drain-3",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          },
          "costs": []
        },
        {
          "id": "drain-6",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          },
          "costs": []
        },
        {
          "id": "drain-4",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          },
          "costs": []
        },
        {
          "id": "drain-5",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          },
          "costs": []
        },
        {
          "id": "boost-1",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "boost-3",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "boost-2",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 1
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 1
            }
          ],
          "costs": []
        },
        {
          "actor": "player",
          "effects": [
            {
              "kind": "move",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "cache-1"
            },
            {
              "kind": "spawn",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "cache-1"
            }
          ],
          "id": "deploy-1",
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "phases": [
          "dawn-1",
          "morning-1",
          "midday-1",
          "afternoon-1",
          "dusk-1",
          "evening-1",
          "twilight-1"
        ],
        "resolution": {
          "order": "random"
        }
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
                  "id": "tally-1"
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
          },
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "score-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 7
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
                  "id": "gauge-1"
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
          },
          {
            "condition": {
              "kind": "cmp",
              "op": ">=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "meter-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 14
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
                  "id": "count-1"
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
        "maxTurns": 55
      },
      "triggers": [
        {
          "event": "start_round",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "amount": 1
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-9b7d9376026e321dda2c94ad725ba320a78338aa57b1f0c205591292a82cce4f",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 4
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 9
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 7
            },
            "initial": 0
          }
        ],
        "tokenTypes": [
          {
            "id": "counter-1",
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 9
                },
                "initial": 0
              }
            ]
          }
        ],
        "zones": [
          {
            "id": "stash-1",
            "tokenType": "counter-1",
            "scope": "per_player",
            "order": "ordered",
            "visibility": "private"
          }
        ]
      },
      "actions": [
        {
          "id": "set-1",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-5",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 11
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 11
            },
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            },
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "==",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "tally-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 8
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "tally-1"
                  },
                  "amount": 1
                }
              ]
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-4",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-8",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-10",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-7",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "drain-1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          },
          "costs": []
        },
        {
          "id": "boost-1",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-9",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-6",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "round_robin",
        "phases": [
          "dawn-1",
          "morning-1"
        ]
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
                  "id": "score-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 11
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
              "op": "<=",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 2
              }
            },
            "outcome": {
              "type": "draw",
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
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 5
              }
            },
            "outcome": {
              "type": "draw",
              "players": "all"
            }
          }
        ],
        "maxTurns": 85
      },
      "triggers": [
        {
          "event": "start_round",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ]
        },
        {
          "event": "start_round",
          "effects": [
            {
              "kind": "set_flag",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "flag": "slowed",
              "duration": "turn"
            },
            {
              "kind": "queue_pop",
              "fromZone": "stash-1"
            }
          ]
        },
        {
          "event": "end_round",
          "effects": [
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "tally-1",
              "direction": "asc"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-420411d59479b6c655d1b64f8ab77adc378e28ffcbba6ed094647be3f8917445",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 3
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 9
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 2
            },
            "initial": 0
          }
        ]
      },
      "actions": [
        {
          "id": "set-1",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-5",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 0
            }
          ]
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-4",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ]
        },
        {
          "id": "set-8",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-7",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-9",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "drain-1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          },
          "costs": []
        },
        {
          "id": "boost-1",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-10",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-6",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "resolution": {
          "order": "by_player_id"
        },
        "phases": [
          "dawn-1",
          "morning-1",
          "midday-1",
          "afternoon-1",
          "dusk-1",
          "evening-1",
          "twilight-1",
          "night-1"
        ]
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
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 8
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 49
      },
      "triggers": [
        {
          "event": "end_round",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "condition": {
            "kind": "cmp",
            "op": ">=",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 4
            }
          }
        }
      ]
    }
  },
  {
    "id": "genome-420411d59479b6c655d1b64f8ab77adc378e28ffcbba6ed094647be3f8917445",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 3
      },
      "state": {
        "variables": [
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 2
            },
            "initial": 0
          }
        ]
      },
      "actions": [
        {
          "id": "set-1",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-5",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 0
            }
          ]
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-4",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            }
          ]
        },
        {
          "id": "set-8",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 3
            }
          ]
        },
        {
          "id": "set-7",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-9",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "drain-1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "boost-1",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-6",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "value": 19
            }
          ],
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "resolution": {
          "order": "by_player_id"
        },
        "phases": [
          "dawn-1",
          "morning-1",
          "midday-1",
          "afternoon-1",
          "dusk-1",
          "evening-1",
          "twilight-1"
        ]
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
                  "id": "score-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 8
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 49
      },
      "triggers": [
        {
          "event": "end_round",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            }
          ],
          "condition": {
            "kind": "cmp",
            "op": ">=",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "score-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 4
            }
          }
        }
      ]
    }
  },
  {
    "id": "genome-9b7d9376026e321dda2c94ad725ba320a78338aa57b1f0c205591292a82cce4f",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 4
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 9
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 7
            },
            "initial": 0
          }
        ],
        "tokenTypes": [
          {
            "id": "counter-1",
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 9
                },
                "initial": 0
              }
            ]
          }
        ],
        "zones": [
          {
            "id": "stash-1",
            "tokenType": "counter-1",
            "scope": "per_player",
            "order": "ordered",
            "visibility": "private"
          }
        ]
      },
      "actions": [
        {
          "id": "drain-1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          }
        },
        {
          "id": "drain-6",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          }
        },
        {
          "id": "drain-13",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          }
        },
        {
          "id": "drain-11",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          }
        },
        {
          "id": "drain-9",
          "actor": "player",
          "effects": [
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "dec",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 2
                  }
                ],
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "score-1"
                    },
                    "amount": 1
                  }
                ]
              ],
              "count": 1
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          }
        },
        {
          "id": "drain-5",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          }
        },
        {
          "id": "drain-12",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          }
        },
        {
          "id": "drain-4",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            },
            {
              "kind": "set_flag",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "flag": "stunned",
              "duration": "turn"
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          }
        },
        {
          "id": "drain-3",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "drain-8",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "drain-7",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "drain-10",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "boost-1",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
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
                "id": "score-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 11
            }
          },
          "costs": []
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 3
            },
            {
              "kind": "move",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "stash-1"
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "retreat-2",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 3
            },
            {
              "kind": "move",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "stash-1"
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "retreat-3",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 3
            },
            {
              "kind": "move",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "stash-1"
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 0
            }
          }
        },
        {
          "id": "retreat-1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 3
            },
            {
              "kind": "move",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "stash-1"
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
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
                "id": "tally-1"
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
        "scheduler": "round_robin",
        "phases": [
          "dawn-1",
          "morning-1"
        ]
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
                  "id": "score-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 11
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 85
      },
      "triggers": [
        {
          "event": "start_round",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ]
        },
        {
          "event": "start_round",
          "effects": [
            {
              "kind": "set_flag",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "flag": "slowed",
              "duration": "turn"
            },
            {
              "kind": "queue_pop",
              "fromZone": "stash-1"
            }
          ]
        },
        {
          "event": "end_round",
          "effects": [
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "tally-1",
              "direction": "asc"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-420411d59479b6c655d1b64f8ab77adc378e28ffcbba6ed094647be3f8917445",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 3
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 19
            },
            "initial": 1
          }
        ],
        "tokenTypes": [
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 4
                },
                "initial": 0
              }
            ],
            "id": "counter-1"
          }
        ],
        "zones": [
          {
            "tokenType": "counter-1",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "private",
            "id": "hand-1"
          }
        ]
      },
      "actions": [
        {
          "id": "set-1",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-5",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            },
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-4",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-9",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-8",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-7",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ]
        },
        {
          "id": "drain-1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          },
          "costs": []
        },
        {
          "id": "boost-1",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-6",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "actor": "player",
          "effects": [
            {
              "kind": "move",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "hand-1"
            },
            {
              "kind": "move",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "hand-1"
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 3
            }
          ],
          "id": "swap-1"
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "resolution": {
          "order": "random"
        },
        "phases": [
          "dawn-1",
          "morning-1",
          "midday-1",
          "afternoon-1",
          "dusk-1",
          "evening-1",
          "twilight-1"
        ]
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
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 8
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 49
      },
      "triggers": [
        {
          "event": "start_turn",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "condition": {
            "kind": "cmp",
            "op": ">=",
            "left": {
              "kind": "ref",
              "ref": {
                "kind": "var",
                "id": "tally-1"
              }
            },
            "right": {
              "kind": "value",
              "value": 4
            }
          }
        },
        {
          "event": "end_turn",
          "effects": [
            {
              "kind": "set_flag",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "flag": "hidden",
              "duration": "phase"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-200a99a68787a4a0de805f13dff5fa787fdede78e777fc3cbbe7b6357653c280",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 4
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 19
            },
            "initial": 1
          },
          {
            "id": "score-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 7
            },
            "initial": 0
          }
        ],
        "tokenTypes": [
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 9
                },
                "initial": 0
              }
            ],
            "id": "counter-1"
          }
        ],
        "zones": [
          {
            "tokenType": "counter-1",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "public",
            "id": "pool-1"
          }
        ]
      },
      "actions": [
        {
          "id": "set-1",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "==",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "tally-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 6
                }
              },
              "then": [
                {
                  "kind": "set",
                  "target": {
                    "kind": "var",
                    "id": "tally-1"
                  },
                  "value": 4
                }
              ]
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-5",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-4",
          "actor": "player",
          "effects": [
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "set",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "value": 4
                  }
                ],
                [
                  {
                    "kind": "move",
                    "target": {
                      "kind": "token",
                      "id": "counter-1"
                    },
                    "toZone": "pool-1"
                  }
                ]
              ],
              "count": 1
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-7",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "drain-1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          },
          "costs": []
        },
        {
          "id": "boost-1",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-6",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-8",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-9",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "actor": "player",
          "effects": [
            {
              "kind": "queue_push",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "pool-1"
            }
          ],
          "id": "act-1",
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "token_holder",
        "tokenType": "counter-1",
        "zone": "pool-1",
        "phases": [
          "dawn-1",
          "morning-1",
          "midday-1",
          "afternoon-1"
        ]
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
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 19
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
              "op": "<",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "score-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 6
              }
            },
            "outcome": {
              "type": "lose",
              "players": "active"
            }
          }
        ],
        "maxTurns": 89
      },
      "triggers": [
        {
          "event": "start_round",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-420411d59479b6c655d1b64f8ab77adc378e28ffcbba6ed094647be3f8917445",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 3
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 9
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          }
        ]
      },
      "actions": [
        {
          "id": "set-1",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-5",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 11
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 11
            },
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            },
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "==",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "tally-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 8
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "tally-1"
                  },
                  "amount": 1
                }
              ]
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "act-1",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 11
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 11
            },
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            },
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "==",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "tally-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 8
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "tally-1"
                  },
                  "amount": 1
                }
              ]
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-4",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-8",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-10",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "set-7",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 2
            }
          ]
        },
        {
          "id": "drain-1",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          },
          "costs": []
        },
        {
          "id": "boost-1",
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ],
          "costs": []
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-9",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        },
        {
          "id": "set-6",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "value": 19
            }
          ],
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "resolution": {
          "order": "by_player_id"
        },
        "phases": [
          "dawn-1",
          "morning-1",
          "midday-1",
          "afternoon-1",
          "dusk-1",
          "evening-1"
        ]
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
                  "id": "tally-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 8
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 49
      },
      "triggers": [
        {
          "event": "end_round",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            }
          ]
        },
        {
          "event": "end_round",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            }
          ]
        }
      ]
    }
  }
]

We fed ChatGPT these genomes and asked it to find out if the genomes indicated issues with our code. We want the game definitions we evolve to always be playable fully.

# ChatGPT's response

You’ve got systemic validity problems in these “best-of-niche” genomes. They’re not “quirky emergent games”; they’re mostly ill-typed, unreachable, or instantly-terminal rulesets. That means your evolution loop is currently allowed to “cheat” (or your runtime is silently clamping/ignoring constraints), and the selection step is rewarding garbage that only looks fit under whatever metrics you’re using.

Below are the concrete flaws I see, tied to specific genomes, and then the code-level validation fixes you should add so this can’t happen again.

1) Cross-cutting flaws that show up everywhere
A) Type/range violations (the big one)

You repeatedly define ints with max: 2/3/7/9/11 and then:

set them to 11 or 19

termination checks thresholds above max (e.g., >= 14 when max is 11)

inc triggers every round/turn in ways that exceed maxTurns unless you clamp

This is not a “small bug.” Either:

Your engine is not enforcing type bounds, or

It’s clamping, and then many terminations become unreachable or guaranteed.

Either way, this destroys meaningful evolution because the genotype ≠ phenotype.

B) Underflow costs / illegal actions

Many actions have costs like dec tally by 2 while tally starts at 0 or 1 and there’s no affordability precondition. So unless your engine:

forbids the action when costs can’t be paid, or

clamps negatives, or

allows negatives despite min: 0

…you’re generating illegal or nonsensical moves constantly.

C) “Not( tally > 0 )” preconditions paired with “dec tally”

Several “drain” actions require NOT (tally > 0), i.e. tally <= 0, and then they decrease tally. That’s either:

a mutation operator producing inverted logic, or

a semantics mismatch (you meant tally > 0)

But as written, those actions are designed to underflow.

D) Token actions without token existence

You have move, set_flag, queue_pop, token_holder scheduling… but frequently no spawn / no initial tokens that guarantee a token exists in the referenced zone.

If your runtime treats “move tokenType X” as “spawn one implicitly,” that’s yet another silent-cheat pathway. If it doesn’t, these games deadlock.

E) Termination contradictions / triviality

Some games have:

win conditions that are unreachable

lose conditions that are true immediately at start

triggers that guarantee a win by round N regardless of play

That means you’re not evolving “games,” you’re evolving “things that terminate quickly or score well under a flawed evaluator.”

F) Duplicate genome IDs in the shortlist

You literally have the same "id" repeated with different definitions (e.g. genome-420411... appears multiple times, as does genome-9b7d...). That’s a bug in your export/selection pipeline (or you’re mixing multiple snapshots).

2) Genome-by-genome: specific flaws

## Genome genome-7160f0ff...

Type/range / unreachable termination

score-1 has max: 3, but termination checks score-1 >= 7 → unreachable if bounds enforced.

meter-1 has max: 11, but termination checks meter-1 >= 14 → unreachable.

count-1 has max: 13, termination >= 9 is reachable, but I see no effects/triggers that ever change count-1 → likely unreachable in practice.

Trigger overflow or guaranteed win

Trigger start_round increments gauge-1 by 1; gauge-1 max: 11, maxTurns: 55.

If bounds enforced, you overflow or clamp by round 12.

If clamped, termination gauge-1 >= 9 becomes a guaranteed win by round 9 no matter what.

Redundant / inconsistent actions

set-1 and set-3 are identical clones.

Many drain-* actions are identical clones.

set-2 sets tally-1 to 19 then 1 then 1 in one action. Unless sequencing matters, this is junk; the final value is 1.

deploy-1 does move counter-1 to cache-1 and then spawn counter-1 to cache-1. The move part is meaningless unless a token already exists (and none are initialized).

## Genome genome-9b7d9376... (the per-player tally version)

Hard invalid sets

tally-1 max: 9, but set-5 sets it to 11 (twice), and set-2/set-6/set-9 set it to 19.

Underflow + inverted drain

drain-1 precondition is not (tally > 0) ⇒ tally <= 0, then effect is dec tally by 1. Pure underflow generator.

Termination incoherence

score-1 max: 7, but termination checks score-1 >= 11 → unreachable if bounds are real.

Token/queue nonsense

Trigger start_round does queue_pop fromZone stash-1 but I see no queue_push anywhere and no initial tokens.

It also sets a flag on counter-1 but again: where is that token coming from?

End-round trigger sets turn order by tally-1 which is per_player. That could be meaningful, but only if your semantics clearly say “order players by their own tally.” If your engine expects a global var for ordering, this is broken.

## Genome genome-420411d5... (3-player, per-player tally + global score max 2)

Hard invalid sets

tally-1 max: 9 but set-2/set-6/set-10 set to 19.

Costs and effects also risk underflow.

Termination likely trivial

Termination tally >= 8 win. With:

boost-1 (+1 free)

lots of set tally=4 actions

trigger: end_round: if tally>=4 then tally +=1

Once a player hits 4, they auto-ramp each round and will likely hit 8 quickly; if simultaneous, multiple players may win together depending on your “active” semantics.

Same inverted drain bug

drain-1 uses not (tally > 0) then decs tally.

## Genome genome-420411d5... (3-player, only score-1 max: 2)

This one is just structurally busted.

score-1 max: 2, but actions set it to 4 and 19.

Termination requires score-1 >= 8.

Trigger increments score-1 when score-1 >= 4 — impossible if max 2 is enforced.

Costs can dec score below 0.

This genome is an excellent canary: your validator is missing, or your runtime ignores types.

## Genome genome-9b7d9376... (global tally version with lots of drains/retreats)

Logic contradictions

Many drain actions have precondition not(tally > 0) paired with costs that also dec tally. That’s both inverted and self-defeating.

Unreachable termination

Win condition score-1 >= 11, but score-1 max: 7. There is a boost-1 that increments score, but it cannot reach 11 under real bounds.

Token lifecycle still unclear

Actions move counter-1 to stash-1 exist, but again: no guaranteed token instances unless your engine treats these as implicit spawns.

## Genome genome-420411d5... (3-player, per-player tally max 19, hand zone, swap)

Token existence problem

swap-1 moves the same counter-1 token to hand-1 twice. If “token” is a type reference, not an instance, this is ambiguous.

No spawn/initial tokens shown; move and set_flag hidden at end_turn operate on something that may not exist.

## Genome genome-200a99a6... (token_holder scheduler, per-player score lose condition)

This one has a killer flaw:

Immediate lose condition

Termination: score-1 < 6 ⇒ lose for active.

But score-1 is per_player with initial: 0. So unless you define termination checks only at certain times and allow score to increase before any check, the game is lost at start for everyone.

I don’t even see any action that increases score-1 anyway.

token_holder deadlock

Turn scheduler is token_holder using tokenType: counter-1 in zone pool-1.

If the pool starts empty (it does, no initial tokens), you can’t pick a token holder ⇒ game can’t start unless you have implicit seeding.

Again: overflow

start_round trigger adds tally += 2 up to maxTurns: 89. Without strict caps, tally runs away.

## Genome genome-420411d5... (global tally max 9 + per-player score max 15)

Hard invalid sets

Several actions set tally-1 to 11 / 19 while max is 9.

Triggers increment both tally and score every end_round; may blow past bounds.

## What you should fix in code (in order of impact)

1) Add a hard static validator before fitness is even computed

Reject any genome that violates any of the following:

### Bounds / typing

Every set(var, value) must satisfy min <= value <= max.

Every inc/dec(var, amount) must have amount >= 0.

If an action can be chosen, its costs must be payable: for each dec(var, amount) cost, require var >= amount via an explicit precondition (or the engine must auto-imply it and your validator should enforce that semantics).

### No overflow from guaranteed triggers

If you have deterministic triggers like start_round: inc gauge +1, then within maxTurns you must not exceed max unless you define clamping and bake that into validation.

### Token prerequisites

If token_holder scheduling is used, require at least one token of that type exists in that zone at start (via initial tokens or a guaranteed start trigger).

If any action/trigger references a token (move/flag/queue ops), the validator must prove at least one such token can exist at the moment it’s referenced.

### Termination sanity

No termination condition should be true in the initial state unless you explicitly allow “instant terminal games” (you don’t).

Every termination threshold must be reachable under bounds (more on reachability below).

### Add a lightweight reachability check (don’t overthink it)

You don’t need SMT to catch 90% of this.

Do an interval abstract interpretation pass:

For each variable, track [minReachable, maxReachable] starting from initial.

Apply:

- action effects (over-approximate: assume action can happen)

- trigger effects per event, bounded by maxTurns (e.g., start_round happens at most maxTurns times)

Iterate to a fixpoint (or just do a small number of passes; your DSL is simple).

Then reject games where:

- Any termination condition requires a value outside reachable interval (maxReachable < threshold for >=, etc.).

- A variable is referenced in termination but has no way to change and initial doesn’t satisfy it.

This alone would kill most of your shortlist.

### Fix your mutation operators (they’re generating nonsense)

Your mutations are currently producing:

- not(>0) in drains

- multi-set sequences on same var in one action

- thresholds above max

- values outside type bounds

Make mutation constraint-aware:

- When mutating a set, sample within [min,max].

- When mutating a termination threshold, sample within the reachable range you computed (or at least within [min,max]).

- When creating a dec cost, either:

-- also create affordability preconditions, or

-- forbid generating that cost unless some existing precondition implies affordability.

### Add an “action normalizer” pass

Before validation/fitness:

Collapse multiple set effects on the same target in the same action to the last set (unless you truly have semantics where intermediate sets matter).

Deduplicate identical actions (same preconditions/costs/effects) — or penalize redundancy hard.

Flag “move then spawn same token to same zone” patterns as likely junk.

### Fix the shortlist/export pipeline (duplicate IDs)

Enforce:

genome IDs are unique in a selection list

if you output multiple phenotypes from the same genome id, then the id isn’t actually the genome id (it’s a niche label or something), and you should rename it.

## The blunt conclusion

Right now your evolution is exploring a space where constraints are optional. That guarantees you’ll keep “discovering” genomes that look good under your evaluator but are either:

- illegal under the rules they claim to have, or

- only “work” because the runtime clamps/forgives errors.

If you want “fully playable at every point of evolution,” you need the validator + reachability filter to be non-negotiable gates before fitness.

I recommend analyzing the current runtime semantics for:

- what happens on overflow/underflow

- whether costs auto-imply preconditions

- whether token references are instances or type-level

- whether missing tokens are errors or implicit spawns

...and determine which of the above checks should be "hard reject" vs "repair then continue," and where your current semantics are encouraging bad evolution.