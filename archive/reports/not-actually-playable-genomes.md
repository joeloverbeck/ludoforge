# Not Actually Playable Genomes

We fed the following shortlist of genomes to ChatGPT:

[
  {
    "id": "genome-e67c7a41ba4a055712f12605ac7bf653866b3329b1fbf89e53fe896a3e8a616a",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 5
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 1
          },
          {
            "id": "gauge-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 3
            },
            "initial": 0
          },
          {
            "id": "meter-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "count-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "points-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 18
            },
            "initial": 0
          },
          {
            "id": "level-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 16
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
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-1"
          },
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-2"
          }
        ],
        "zones": [
          {
            "tokenType": "counter-1",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "private",
            "id": "hand-1"
          },
          {
            "tokenType": "counter-2",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "private",
            "id": "hand-2"
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
              "value": 2
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
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
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
              "value": 2
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
              "amount": 3
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
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "score-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          }
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "value": 0
            }
          ],
          "costs": []
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
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
          ]
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-1",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-5",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-3",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            },
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            }
          ],
          "id": "boost-1",
          "costs": []
        },
        {
          "actor": "player",
          "effects": [],
          "id": "traverse-1",
          "costs": []
        },
        {
          "actor": "player",
          "effects": [
            {
              "kind": "spawn",
              "target": {
                "kind": "token",
                "id": "counter-2"
              },
              "toZone": "hand-1"
            },
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "queue_push",
                    "target": {
                      "kind": "token",
                      "id": "counter-1"
                    },
                    "toZone": "hand-1"
                  }
                ],
                [
                  {
                    "kind": "destroy",
                    "target": {
                      "kind": "token",
                      "id": "counter-2"
                    }
                  }
                ]
              ],
              "count": 1
            }
          ],
          "id": "act-4",
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
              "toZone": "hand-1"
            },
            {
              "kind": "queue_pop",
              "fromZone": "hand-2"
            }
          ],
          "id": "act-6",
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
              "toZone": "hand-1"
            },
            {
              "kind": "queue_pop",
              "fromZone": "hand-2"
            }
          ],
          "id": "act-7",
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "phases": [
          "dawn-1",
          "morning-1",
          "afternoon-1",
          "midday-1",
          "dusk-1",
          "evening-1"
        ],
        "resolution": {
          "order": "by_player_id"
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
                "value": 5
              }
            },
            "outcome": {
              "type": "lose",
              "players": "active"
            }
          },
          {
            "condition": {
              "kind": "cmp",
              "op": ">",
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
            },
            "outcome": {
              "type": "lose",
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
                "value": 3
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
                "value": 15
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
              "op": "==",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 7
              }
            },
            "outcome": {
              "type": "lose",
              "players": "all"
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
                "value": 3
              }
            },
            "outcome": {
              "type": "win",
              "players": "active"
            }
          }
        ],
        "maxTurns": 18
      },
      "triggers": [
        {
          "event": "end_phase",
          "effects": [
            {
              "kind": "spawn",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "toZone": "hand-1"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-e67c7a41ba4a055712f12605ac7bf653866b3329b1fbf89e53fe896a3e8a616a",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 5
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 1
          },
          {
            "id": "gauge-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 3
            },
            "initial": 0
          },
          {
            "id": "meter-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "count-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "points-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 18
            },
            "initial": 0
          },
          {
            "id": "level-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 16
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
                  "max": 5
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
              "value": 2
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
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
            }
          ]
        },
        {
          "id": "set-2",
          "actor": "player",
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
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "value": 0
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 1
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
                "id": "meter-1"
              },
              "value": 5
            }
          ],
          "costs": []
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 4
            }
          ]
        },
        {
          "id": "act-4",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 4
            }
          ]
        },
        {
          "id": "act-1",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 0
                  }
                ],
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "gauge-1"
                    },
                    "amount": 1
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 1
                  }
                ],
                [
                  {
                    "kind": "queue_push",
                    "target": {
                      "kind": "token",
                      "id": "counter-1"
                    },
                    "toZone": "hand-1"
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
            },
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
            "kind": "not",
            "value": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          },
          "costs": [
            {
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
            }
          ]
        },
        {
          "id": "act-3",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "actor": "player",
          "effects": [],
          "id": "traverse-1",
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "phases": [
          "dawn-1",
          "morning-1",
          "midday-1"
        ],
        "resolution": {
          "order": "by_player_id"
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
                  "id": "meter-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 5
              }
            },
            "outcome": {
              "type": "lose",
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
                "value": 4
              }
            },
            "outcome": {
              "type": "lose",
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
                "value": 3
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
                "value": 15
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
              "op": "==",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 7
              }
            },
            "outcome": {
              "type": "lose",
              "players": "all"
            }
          }
        ],
        "maxTurns": 18
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
              "amount": 2
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
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
    "id": "genome-e67c7a41ba4a055712f12605ac7bf653866b3329b1fbf89e53fe896a3e8a616a",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 5
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 1
          },
          {
            "id": "gauge-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 3
            },
            "initial": 0
          },
          {
            "id": "meter-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 1
          },
          {
            "id": "count-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
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
                  "max": 7
                },
                "initial": 0
              }
            ],
            "id": "counter-2"
          },
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 7
                },
                "initial": 0
              }
            ],
            "id": "counter-1"
          }
        ],
        "zones": [
          {
            "tokenType": "counter-2",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "public",
            "id": "pool-1"
          },
          {
            "tokenType": "counter-2",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "public",
            "id": "pool-2"
          },
          {
            "tokenType": "counter-1",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "public",
            "id": "pool-3"
          }
        ]
      },
      "actions": [
        {
          "id": "set-1",
          "actor": "player",
          "effects": [
            {
              "kind": "hide",
              "target": {
                "kind": "zone",
                "id": "pool-1"
              }
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 3
            },
            {
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-2"
              }
            }
          ]
        },
        {
          "id": "drain-1",
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
                      "id": "score-1"
                    },
                    "amount": 2
                  }
                ],
                [
                  {
                    "kind": "repeat",
                    "count": 2,
                    "effects": [
                      {
                        "kind": "dec",
                        "target": {
                          "kind": "var",
                          "id": "meter-1"
                        },
                        "amount": 1
                      }
                    ]
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
                "id": "score-1"
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
                  "id": "score-1"
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
          "id": "act-2",
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
                      "id": "score-1"
                    },
                    "amount": 2
                  }
                ],
                [
                  {
                    "kind": "repeat",
                    "count": 2,
                    "effects": [
                      {
                        "kind": "dec",
                        "target": {
                          "kind": "var",
                          "id": "meter-1"
                        },
                        "amount": 1
                      }
                    ]
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 4
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "value": 0
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "value": 0
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
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "score-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          }
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "value": 0
            }
          ],
          "costs": []
        },
        {
          "id": "set-5",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "value": 0
            },
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
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 3
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 0
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
                "id": "meter-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 1
            }
          ]
        },
        {
          "id": "set-6",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 4
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 1
            }
          ]
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "count-1"
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
                "id": "count-1"
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
          "actor": "player",
          "effects": [
            {
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-2"
              }
            }
          ],
          "id": "act-1",
          "costs": [],
          "params": [
            {
              "id": "pick-1",
              "kind": "token",
              "domain": {
                "selector": {
                  "zone": "pool-2",
                  "tokenType": "counter-2",
                  "count": 1
                }
              }
            }
          ]
        },
        {
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "amount": 1
            },
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "count-1"
              },
              "amount": 2
            }
          ],
          "id": "drain-3",
          "costs": []
        },
        {
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "amount": 1
            }
          ],
          "id": "drain-4",
          "costs": [],
          "params": [
            {
              "id": "pick-2",
              "kind": "token",
              "domain": {
                "selector": {
                  "zone": "pool-3",
                  "tokenType": "counter-1",
                  "count": 1
                }
              }
            }
          ]
        },
        {
          "actor": "player",
          "effects": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "amount": 1
            }
          ],
          "id": "drain-5",
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "resolution": {
          "order": "by_player_id"
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
                  "id": "score-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 4
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
                  "id": "gauge-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 3
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
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 9
              }
            },
            "outcome": {
              "type": "lose",
              "players": "active"
            }
          },
          {
            "condition": {
              "kind": "cmp",
              "op": "==",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "gauge-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 1
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
                "value": 3
              }
            },
            "outcome": {
              "type": "win",
              "players": "all"
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
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 3
              }
            },
            "outcome": {
              "type": "win",
              "players": "all"
            }
          }
        ],
        "maxTurns": 18
      },
      "triggers": [
        {
          "event": "end_round",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "value",
                "value": true
              },
              "then": [
                {
                  "kind": "inc",
                  "target": {
                    "kind": "var",
                    "id": "score-1"
                  },
                  "amount": 1
                }
              ],
              "else": [
                {
                  "kind": "inc",
                  "target": {
                    "kind": "var",
                    "id": "score-1"
                  },
                  "amount": 2
                }
              ]
            },
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 2
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "tally-1",
              "direction": "asc"
            }
          ]
        },
        {
          "event": "state_change",
          "effects": [
            {
              "kind": "move",
              "target": {
                "kind": "token",
                "id": "counter-2"
              },
              "toZone": "pool-1"
            }
          ]
        },
        {
          "event": "end_round",
          "effects": [
            {
              "kind": "move",
              "target": {
                "kind": "token",
                "id": "counter-2"
              },
              "toZone": "pool-1"
            }
          ]
        },
        {
          "event": "end_phase",
          "effects": [
            {
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-2"
              }
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-e67c7a41ba4a055712f12605ac7bf653866b3329b1fbf89e53fe896a3e8a616a",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 5
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 1
          },
          {
            "id": "gauge-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 3
            },
            "initial": 0
          },
          {
            "id": "meter-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "count-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "points-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 18
            },
            "initial": 0
          },
          {
            "id": "level-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 16
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
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-1"
          },
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-2"
          }
        ],
        "zones": [
          {
            "tokenType": "counter-1",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "private",
            "id": "hand-1"
          },
          {
            "tokenType": "counter-2",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "private",
            "id": "hand-2"
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
              "value": 2
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
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
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
              "value": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 4
            },
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "gauge-1"
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
                "id": "score-1"
              },
              "amount": 3
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
            },
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
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
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "score-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          }
        },
        {
          "id": "set-2",
          "actor": "player",
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
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "value": 0
            }
          ],
          "costs": []
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
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
            },
            {
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
            }
          ]
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-1",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-5",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-3",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "actor": "player",
          "effects": [
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            },
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            }
          ],
          "id": "boost-1",
          "costs": []
        },
        {
          "actor": "player",
          "effects": [],
          "id": "traverse-1",
          "costs": []
        },
        {
          "actor": "player",
          "effects": [
            {
              "kind": "spawn",
              "target": {
                "kind": "token",
                "id": "counter-2"
              },
              "toZone": "hand-1"
            },
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "queue_push",
                    "target": {
                      "kind": "token",
                      "id": "counter-1"
                    },
                    "toZone": "hand-1"
                  }
                ],
                [
                  {
                    "kind": "destroy",
                    "target": {
                      "kind": "token",
                      "id": "counter-2"
                    }
                  }
                ]
              ],
              "count": 1
            }
          ],
          "id": "act-4",
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
              "toZone": "hand-1"
            },
            {
              "kind": "queue_pop",
              "fromZone": "hand-2"
            }
          ],
          "id": "act-6",
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "phases": [
          "dawn-1",
          "morning-1",
          "afternoon-1"
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
                  "id": "meter-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 5
              }
            },
            "outcome": {
              "type": "lose",
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
                "value": 4
              }
            },
            "outcome": {
              "type": "lose",
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
                "value": 3
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
                "value": 15
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
              "op": "==",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 7
              }
            },
            "outcome": {
              "type": "lose",
              "players": "all"
            }
          }
        ],
        "maxTurns": 18
      },
      "triggers": [
        {
          "event": "end_round",
          "effects": [
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 2
            },
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
    "id": "genome-e67c7a41ba4a055712f12605ac7bf653866b3329b1fbf89e53fe896a3e8a616a",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 5
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 1
          },
          {
            "id": "gauge-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 3
            },
            "initial": 0
          },
          {
            "id": "meter-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 1
          },
          {
            "id": "count-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "points-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 18
            },
            "initial": 0
          },
          {
            "id": "level-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 16
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
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-1"
          },
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-2"
          },
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-3"
          }
        ],
        "zones": [
          {
            "tokenType": "counter-3",
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
              "value": 2
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
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
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
              "value": 2
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
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
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
              "value": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 5
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
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "score-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": []
        },
        {
          "id": "set-2",
          "actor": "player",
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
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "value": 0
            }
          ],
          "costs": []
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
            }
          ],
          "costs": []
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 4
            }
          ],
          "params": [
            {
              "id": "pick-1",
              "kind": "token",
              "domain": {
                "selector": {
                  "zone": "hand-1",
                  "tokenType": "counter-3",
                  "count": 1
                }
              }
            }
          ]
        },
        {
          "id": "act-4",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 4
            }
          ]
        },
        {
          "id": "act-1",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
            },
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "score-1"
              },
              "amount": 1
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
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
                  "id": "count-1"
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
          "id": "act-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 0
                  }
                ],
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "gauge-1"
                    },
                    "amount": 1
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "inc",
              "target": {
                "kind": "var",
                "id": "tally-1"
              },
              "amount": 1
            },
            {
              "kind": "inc",
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
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 0
              }
            }
          },
          "costs": [
            {
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
            },
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "amount": 1
            }
          ]
        },
        {
          "id": "act-3",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "id": "boost-1",
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
          "actor": "player",
          "effects": [],
          "id": "traverse-1",
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
          "evening-1"
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
                "value": 5
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
                "value": 4
              }
            },
            "outcome": {
              "type": "lose",
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
                "value": 3
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
                "value": 15
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
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 7
              }
            },
            "outcome": {
              "type": "lose",
              "players": "all"
            }
          }
        ],
        "maxTurns": 18
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
              "amount": 2
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "asc"
            },
            {
              "kind": "set_flag",
              "target": {
                "kind": "token",
                "id": "counter-2"
              },
              "flag": "stunned",
              "duration": "action"
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-e67c7a41ba4a055712f12605ac7bf653866b3329b1fbf89e53fe896a3e8a616a",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 5
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 1
          },
          {
            "id": "gauge-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 3
            },
            "initial": 0
          },
          {
            "id": "meter-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "count-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "points-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 18
            },
            "initial": 0
          },
          {
            "id": "level-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 16
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
                  "max": 5
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
              "value": 2
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
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
            }
          ]
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set_flag",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "flag": "slowed",
              "duration": "turn"
            }
          ],
          "costs": []
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
            }
          ],
          "costs": []
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 4
            }
          ]
        },
        {
          "id": "act-4",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 4
            }
          ]
        },
        {
          "id": "act-1",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 0
                  }
                ],
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "gauge-1"
                    },
                    "amount": 1
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 1
                  }
                ],
                [
                  {
                    "kind": "queue_push",
                    "target": {
                      "kind": "token",
                      "id": "counter-1"
                    },
                    "toZone": "hand-1"
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 1
                  }
                ],
                [
                  {
                    "kind": "spawn",
                    "target": {
                      "kind": "token",
                      "id": "counter-1"
                    },
                    "toZone": "hand-1"
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
            },
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
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
            }
          ]
        },
        {
          "id": "act-3",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": []
        },
        {
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
          "id": "boost-1",
          "costs": []
        },
        {
          "actor": "player",
          "effects": [],
          "id": "traverse-1",
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
          "evening-1"
        ],
        "resolution": {
          "order": "by_player_id"
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
                "value": 5
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
                "value": 4
              }
            },
            "outcome": {
              "type": "lose",
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
                "value": 3
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
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 7
              }
            },
            "outcome": {
              "type": "lose",
              "players": "all"
            }
          }
        ],
        "maxTurns": 18
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
              "amount": 2
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-e67c7a41ba4a055712f12605ac7bf653866b3329b1fbf89e53fe896a3e8a616a",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 5
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 1
          },
          {
            "id": "gauge-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 3
            },
            "initial": 0
          },
          {
            "id": "meter-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "count-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "points-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 18
            },
            "initial": 0
          },
          {
            "id": "level-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 16
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
                  "max": 5
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
              "value": 2
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
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
            }
          ]
        },
        {
          "id": "set-2",
          "actor": "player",
          "effects": [
            {
              "kind": "set_flag",
              "target": {
                "kind": "token",
                "id": "counter-1"
              },
              "flag": "slowed",
              "duration": "turn"
            }
          ],
          "costs": []
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
            }
          ],
          "costs": []
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 4
            }
          ]
        },
        {
          "id": "act-4",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "amount": 4
            }
          ]
        },
        {
          "id": "act-1",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 0
                  }
                ],
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "gauge-1"
                    },
                    "amount": 1
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 1
                  }
                ],
                [
                  {
                    "kind": "queue_push",
                    "target": {
                      "kind": "token",
                      "id": "counter-1"
                    },
                    "toZone": "hand-1"
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "inc",
                    "target": {
                      "kind": "var",
                      "id": "tally-1"
                    },
                    "amount": 1
                  }
                ],
                [
                  {
                    "kind": "spawn",
                    "target": {
                      "kind": "token",
                      "id": "counter-1"
                    },
                    "toZone": "hand-1"
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
            },
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
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": [
            {
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
            }
          ]
        },
        {
          "id": "act-3",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": []
        },
        {
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
          "id": "boost-1",
          "costs": []
        },
        {
          "actor": "player",
          "effects": [],
          "id": "traverse-1",
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
          "evening-1"
        ],
        "resolution": {
          "order": "by_player_id"
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
                "value": 5
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
                "value": 4
              }
            },
            "outcome": {
              "type": "lose",
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
                "value": 3
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
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 7
              }
            },
            "outcome": {
              "type": "lose",
              "players": "all"
            }
          },
          {
            "condition": {
              "kind": "cmp",
              "op": ">",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "level-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 11
              }
            },
            "outcome": {
              "type": "draw",
              "players": "all"
            }
          }
        ],
        "maxTurns": 18
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
              "amount": 2
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "genome-e67c7a41ba4a055712f12605ac7bf653866b3329b1fbf89e53fe896a3e8a616a",
    "definition": {
      "version": "1.0",
      "players": {
        "count": 2
      },
      "state": {
        "variables": [
          {
            "id": "tally-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 5
            },
            "initial": 0
          },
          {
            "id": "score-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 4
            },
            "initial": 1
          },
          {
            "id": "gauge-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 3
            },
            "initial": 0
          },
          {
            "id": "meter-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "count-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 15
            },
            "initial": 0
          },
          {
            "id": "points-1",
            "scope": "global",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 18
            },
            "initial": 0
          },
          {
            "id": "level-1",
            "scope": "per_player",
            "type": {
              "kind": "int",
              "min": 0,
              "max": 16
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
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-1"
          },
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-2"
          },
          {
            "attributes": [
              {
                "id": "value",
                "scope": "global",
                "type": {
                  "kind": "int",
                  "min": 0,
                  "max": 5
                },
                "initial": 0
              }
            ],
            "id": "counter-3"
          }
        ],
        "zones": [
          {
            "tokenType": "counter-1",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "private",
            "id": "hand-1"
          },
          {
            "tokenType": "counter-3",
            "scope": "per_player",
            "order": "unordered",
            "visibility": "private",
            "id": "hand-2"
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
              "value": 2
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
              "kind": "destroy",
              "target": {
                "kind": "token",
                "id": "counter-1"
              }
            }
          ],
          "params": [
            {
              "id": "pick-1",
              "kind": "token",
              "domain": {
                "selector": {
                  "zone": "hand-2",
                  "tokenType": "counter-3",
                  "count": 1
                }
              }
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
              "value": 2
            }
          ],
          "costs": [
            {
              "kind": "dec",
              "target": {
                "kind": "var",
                "id": "gauge-1"
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
              "amount": 3
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
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "score-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          }
        },
        {
          "id": "set-2",
          "actor": "player",
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
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "gauge-1"
              },
              "value": 0
            }
          ],
          "costs": []
        },
        {
          "id": "set-3",
          "actor": "player",
          "effects": [
            {
              "kind": "set",
              "target": {
                "kind": "var",
                "id": "meter-1"
              },
              "value": 5
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
          ]
        },
        {
          "id": "drain-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-1",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
            }
          ],
          "preconditions": {
            "kind": "not",
            "value": {
              "kind": "not",
              "value": {
                "kind": "cmp",
                "op": ">",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "count-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 0
                }
              }
            }
          },
          "costs": []
        },
        {
          "id": "act-5",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "<",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "level-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 10
                }
              },
              "then": [
                {
                  "kind": "conditional",
                  "condition": {
                    "kind": "cmp",
                    "op": "!=",
                    "left": {
                      "kind": "ref",
                      "ref": {
                        "kind": "var",
                        "id": "points-1"
                      }
                    },
                    "right": {
                      "kind": "value",
                      "value": 7
                    }
                  },
                  "then": [
                    {
                      "kind": "dec",
                      "target": {
                        "kind": "var",
                        "id": "count-1"
                      },
                      "amount": 3
                    }
                  ]
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-2",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "id": "act-3",
          "actor": "player",
          "effects": [
            {
              "kind": "conditional",
              "condition": {
                "kind": "cmp",
                "op": "!=",
                "left": {
                  "kind": "ref",
                  "ref": {
                    "kind": "var",
                    "id": "points-1"
                  }
                },
                "right": {
                  "kind": "value",
                  "value": 7
                }
              },
              "then": [
                {
                  "kind": "dec",
                  "target": {
                    "kind": "var",
                    "id": "count-1"
                  },
                  "amount": 3
                }
              ]
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
                  "id": "count-1"
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
          "id": "boost-1",
          "costs": []
        },
        {
          "actor": "player",
          "effects": [],
          "id": "traverse-1",
          "costs": []
        },
        {
          "actor": "player",
          "effects": [
            {
              "kind": "rng_choose",
              "options": [
                [
                  {
                    "kind": "queue_push",
                    "target": {
                      "kind": "token",
                      "id": "counter-1"
                    },
                    "toZone": "hand-1"
                  }
                ],
                [
                  {
                    "kind": "destroy",
                    "target": {
                      "kind": "token",
                      "id": "counter-2"
                    }
                  }
                ]
              ],
              "count": 1
            },
            {
              "kind": "spawn",
              "target": {
                "kind": "token",
                "id": "counter-2"
              },
              "toZone": "hand-1"
            }
          ],
          "id": "act-4",
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
              "toZone": "hand-1"
            },
            {
              "kind": "queue_pop",
              "fromZone": "hand-1"
            },
            {
              "kind": "spawn",
              "target": {
                "kind": "token",
                "id": "counter-2"
              },
              "toZone": "hand-2"
            }
          ],
          "id": "act-6",
          "costs": []
        }
      ],
      "turn": {
        "scheduler": "simultaneous",
        "phases": [
          "dawn-1",
          "morning-1",
          "midday-1"
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
                  "id": "meter-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 5
              }
            },
            "outcome": {
              "type": "lose",
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
                "value": 4
              }
            },
            "outcome": {
              "type": "lose",
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
                "value": 3
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
                "value": 15
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
              "op": "==",
              "left": {
                "kind": "ref",
                "ref": {
                  "kind": "var",
                  "id": "count-1"
                }
              },
              "right": {
                "kind": "value",
                "value": 7
              }
            },
            "outcome": {
              "type": "lose",
              "players": "all"
            }
          }
        ],
        "maxTurns": 18
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
              "amount": 2
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "desc"
            },
            {
              "kind": "set_turn_order",
              "order": "by_variable",
              "variable": "meter-1",
              "direction": "asc"
            }
          ]
        }
      ]
    }
  }
]

----

The goal was for ChatGPT to determine if we had flaws in our app, as we don't want for evolution to produce game definition genomes that aren't actually valid games.

## ChatGPT's response

You’ve got multiple classes of “not actually playable” bugs showing up here. The big takeaway: your pipeline is letting invalid ASTs survive (and maybe even score well), because you’re missing (a) hard validators, (b) automatic precondition synthesis / feasibility checks, and (c) any kind of reachability analysis for termination.

Below I’ll be blunt and concrete, with examples pulled straight from these genomes.

0) Immediate red flag: every entry has the exact same genome id

All items in your shortlist have:

"id": "genome-e67c7a41ba4a0557..." (identical)

That’s either:

a serialization / export bug, or

your niche selection is accidentally duplicating the same “champion id” even when the definition differs (worse: means you can’t track lineage correctly).

Fix in code: enforce unique(genome.id) at the shortlist layer. If you intentionally allow duplicates, then the definition needs its own stable hash, and you should treat (id, definitionHash) as the identity.

1) Hard structural invalidities your engine should never allow
A) Zone/tokenType mismatches (literal type errors)

In the first definition:

- hand-1 is declared as tokenType: "counter-1"

- but action act-4 does:
spawn counter-2 -> toZone "hand-1"

That is a type violation. If your engine allows that, everything downstream becomes unreliable.

Fix: “zone accepts tokenType” must be a hard constraint at validation time.

B) Actions that spend resources without any feasibility gate

Example (first definition):

- set-4 costs: dec tally-1 amount: 3

- but tally-1 is min: 0, starts at 0

- no precondition like tally-1 >= 3

So the action is not well-defined unless your runtime silently clamps or ignores costs (both are poison for evolution).

Same thing all over:

- costs decrementing variables that start at 0,

- destroying tokens that may not exist,

- queue_pop from potentially empty zones.

Fix: either

- forbid “unsafe” costs unless guarded, or

- auto-synthesize preconditions from costs.

Auto-precondition rule (must-have):

- for every dec(var, amount=A) in costs ⇒ add precondition var >= A

- for every destroy(tokenType=T) ⇒ require existence count(tokens of T in legal domain) >= 1

- for every queue_pop(fromZone=Z) ⇒ require size(Z) >= 1

If you don’t want hard forbiddance, then penalize genomes that require auto-repair.

C) Parameters declared but not used (semantic rot)

In one definition:

"params": [{"id":"pick-1", "kind":"token", "domain": {...}}]


…but the effect does:

{"kind":"destroy","target":{"kind":"token","id":"counter-2"}}


No reference to pick-1. So your param system is getting ignored or your effect targeting is underspecified.

Fix: validation rule: every param must be referenced OR the compiler must erase unused params before evaluation/scoring.

D) Duplicate / cancelling effects = no-op actions

Examples:

- boost-1 does inc score-1 by 1 and dec score-1 by 1 in the same action. Net zero.

- traverse-1 has no effects, no costs.

No-op actions are fine only if you explicitly support “pass”. Otherwise they bloat action sets and break search.

Fix: simplification pass:

- cancel opposing effects on same target

- drop pure no-op actions unless they are your intentional “pass” primitive

2) The really damaging bug pattern: inverted preconditions via not(...)

This shows up repeatedly and is catastrophically anti-playability.

Example (first definition): actions that can only run at count-1 == 0, then decrement count below 0

You have actions like drain-2 / act-1 / act-2 / act-3 / act-5 with precondition:

"preconditions": {
  "kind": "not",
  "value": {
    "kind": "cmp",
    "op": ">",
    "left": {"ref": {"id":"count-1"}},
    "right": {"value":0}
  }
}


That means: NOT(count > 0) ⇒ count <= 0 ⇒ since count min is 0, this is effectively count == 0.

Then the effect is (often under a condition that is true at start):

- if points-1 != 7 (points starts 0) ⇒ dec count-1 by 3

So at the initial state, the action is “legal”, and it immediately tries to create an invalid state (count = -3).

That is not a balancing problem; it’s a logic bug or missing safety rules.

Likely root causes:

- your mutation operator is flipping comparators / wrapping nots without repairing meaning

- your engine is treating “illegal transitions” as allowed (clamp/no-op), so evolution doesn’t care

Fix options (pick one and be strict):

1. Runtime forbids invalid post-state ⇒ action is illegal (preferred)

2. Or auto-repair to min/max ⇒ but then fitness must penalize repairs heavily

3. Or static validator rejects any action whose worst-case cost/effect can violate bounds under satisfiable preconditions

3) Termination conditions that are unreachable, contradictory, or always-true

This is the second big theme: you’re generating win/lose/draw conditions that can never happen or happen immediately.

A) Unreachable because of min/max

Example (first definition):

- termination: score-1 > 4 causes lose

- but score-1 is max: 4

So score > 4 is impossible unless your engine allows exceeding max (which would also be a bug vs your declared type).

Same pattern appears elsewhere.

Fix: validator check: every cmp(var op constant) must be satisfiable given the declared range, or penalize/remove it.

B) Termination triggered at start (always-true)

In one definition you have:

- termination condition: count-1 < 3 ⇒ win all

- count-1 starts at 0

So the game can terminate immediately with a win before any action.

Unless you explicitly only check termination at end-of-turn and the game is forced to act first… but even then it’ll terminate at the first check.

Fix: sanity rule:

- No termination condition may be true in the initial state unless explicitly flagged as “opening condition”.

C) Contradictory overlapping terminations (win + lose on same variable region)

Example (first definition):

- if tally-1 >= 5 ⇒ lose active

- if tally-1 >= 3 ⇒ win active

If both are checked, tally >= 5 satisfies both. You might rely on ordering, but that makes the ruleset fragile and non-local.

Fix: either

- enforce mutual exclusivity (static check), or

- enforce explicit priority semantics (and bake that into fitness + analyzer)

D) Win conditions with no way to change the driving variable

Example (first definition again):

- win on gauge-1 >= 3

- but I only see actions setting gauge to 0; no increments anywhere

So “win” exists syntactically, but it is unreachable.

Fix: reachability analysis (see section 5).

4) Playability failures: “no legal moves” or “degenerate always-lose”

Even when the rules aren’t immediately inconsistent, a lot of these designs look like:

- you can take actions that instantly force loss (e.g., setting meter to a value that triggers a lose threshold),

- or you can’t take the meaningful actions because their preconditions are unsatisfiable,

- or the game will always end by maxTurns because no termination can be reached.

That’s not inherently illegal, but for evolution it’s deadly unless your fitness strongly punishes it.

Minimum playability criteria you should enforce:

- From the initial state, in every phase/turn until termination, at least one legal action exists for each player (or a defined “pass” exists).

- There exists at least one reachable terminal outcome other than maxTurns fallback.

- There exists at least one reachable win path and at least one reachable loss/draw path (unless you’re evolving strictly-coop/puzzle games).

5) What you should add to your code: a “validator + analyzer + repair” gauntlet

If you only implement one thing, implement this pipeline:

### Stage 1 — Structural validation (hard reject)

unique ids inside a definition (variables, tokenTypes, zones, actions, phases)

every referenced var/zone/tokenType exists

zone tokenType compatibility on spawn/move/queue_push/etc

params must be referenced

no duplicate triggers that are byte-identical (or simplify them)

### Stage 2 — Effect/cost safety (hard reject or auto-precondition)

auto-add preconditions for costs (dec/destroy/pop)

reject if costs can still underflow given the preconditions

reject if any effect can overflow declared max (or define clamping explicitly and penalize)

### Stage 3 — Simplifier (always run)

cancel inc/dec on same var in same action when order-independent

remove duplicated set_turn_order calls

drop no-op actions unless they’re your intentional “pass”

### Stage 4 — Reachability approximation (cheap but powerful)

Do an interval abstract interpretation for each variable:

Start from initial ranges (singletons)

Apply action effects conservatively to infer possible ranges after N steps

If a termination predicate is never satisfiable under inferred ranges ⇒ flag unreachable

If a termination predicate is satisfiable at step 0 ⇒ flag immediate termination

This is fast and catches 70% of your current failures.

### Stage 5 — Bounded model check (optional, stronger)

For small games, do a bounded SAT/SMT search up to (say) 6–10 plies:

Is there any sequence that reaches a win?

Is there any legal action available at each step?

Can any cost underflow happen?

Even one of these checks per genome will massively improve selection quality.

6) Why these “best-in-niche” genomes are still broken

Right now it looks like the system can produce a definition that:

- violates invariants,

- has unreachable wins,

- has actions that are “legal” but produce invalid states,

- and still survive.

That almost always means your scorer isn’t harshly penalizing invalidity, or your engine is silently repairing/clamping and not exposing the repair cost to fitness.

My strong opinion: invalid transitions should be fatal (action is illegal), and genomes that often have no legal moves should be strongly penalized. Otherwise evolution will happily drift into nonsense.