# Technical Specification: Evolutionary Tabletop Game Design System

## 1. System Architecture

Overview: The system is structured as a modular pipeline that generates, simulates, and evaluates tabletop game prototypes. At its core is a universal game kernel (virtual machine) that can interpret any game defined in the DSL. Surrounding this kernel are components for evolutionary generation, simulation (with AI agents), evaluation (automated metrics and human feedback), and a text-based user interface for interaction.

Components:

Game Definition Kernel (DSL Interpreter): A universal “tabletop VM” that enforces the minimal semantics of any game. It manages game state, applies legal actions to transition state, handles the turn structure, checks termination conditions, and computes outcomes/payoffs. This kernel does not assume a specific genre (card game, board game, etc.) or player count. Instead, it provides abstract constructs (state variables, agents, actions, zones, etc.) so that any turn-based game can be represented. The kernel ensures that a game definition is executable (i.e. playable) by answering fundamental questions: What are the valid moves at a given state? Whose turn is it? Has the game ended, and who won?. It also enforces global bounds (like maximum turns or state sizes) to keep games finite.

Game Generator (Evolutionary Engine): This component uses evolutionary or genetic algorithms to create new game designs (the “candidates”). Each game design is represented as a “genome” in the DSL (essentially an abstract syntax tree of game rules). The generator can perform mutations and crossovers on these genomes – e.g. adding/removing a state variable, tweaking an action’s effects, or altering a win condition. The evolutionary search operates over a population of game candidates, guided by a fitness function (initially automated metrics, later the learned fun model). To maintain diversity and avoid converging on trivial designs, the generator may incorporate quality-diversity algorithms (MAP-Elites) instead of a single leaderboard. For example, games might be categorized by number of players, randomness level, game length, etc., and evolved within those niches rather than directly compared on one scalar. This ensures the system “discovers interesting stuff” across the design space without the search turning into a junkyard of broken games.

Simulation Engine (Automated Play): The simulation engine takes a generated game and runs playthroughs using AI agents. It instantiates the game in the kernel and cycles through turns, selecting actions for each agent. Agents can be simple heuristic bots (e.g. a greedy strategy, a risk-averse vs. risk-seeking bot) or more advanced search-based players (Monte Carlo Tree Search for a few plies, etc.). These simulations produce game trajectories (state histories). The simulation engine logs key data: state changes, actions taken, game length, outcome, etc., for use in evaluation. This component must support 1-player through N-player games seamlessly – for N>1, it will instantiate multiple agent instances (which could be AI or human). The kernel treats “agents” abstractly, enabling cooperative games (shared reward) or competitive games (distinct payoffs) based on the game definition. The simulation engine can run in batch (automated self-play) for evaluation, or step-by-step for human-interactive play via the UI.

Evaluation and Analytics: This module computes fitness metrics for each game candidate. Initially, fitness is determined by automated metrics derived from simulation (before human preference data is available). The system tracks a “fun-vector” of proxy measures for each game’s playthroughs – e.g. agency (how much choices affect outcomes), strategic depth (branching factor of decisions), skill expression (win-rate gap between strong vs. weak agents), variety (entropy of game trajectories), pacing/tension (progression of win/loss probability), degeneracy signals (loops, stalemates, dominant moves), interaction rate (frequency of meaningful player interaction), etc.. These are computed from simulation data. The evaluation module automatically filters out unpromising games: if a game shows signs of degeneracy (e.g. infinite loops, trivial “press button to win” strategies, no meaningful choices), it is discarded. The survivors receive a composite score or are marked for human testing. Over time, as human feedback is incorporated, this module learns a predictive model of fun (the user’s preference function) which becomes the primary fitness function (see Section 6).

Human Interaction Interface: A text-based interface allows human designers or testers to play the generated prototypes and provide feedback. The interface uses the game kernel to present the game state and available actions in a readable text form each turn. For example, it may list state variables (scores, resources, etc.), describe tokens on a board or cards in hand, and enumerate legal moves with numbered choices. The user can input the choice to apply an action, and the interface will update the state accordingly. This component essentially provides a generic shell around any game defined in the DSL, so that a human can step through turns and experience the gameplay without any custom UI coding for each new game. Additionally, the interface is used for human evaluation: after or during gameplay, the user can rate the game or compare two games (pairwise preference), which is fed back into the evolutionary loop. The interface might present two game summaries or two short play sessions and ask which one was more enjoyable. For multi-player games, the text interface could support multiple human participants (or one human and rest AI) by alternating prompts, though initial development may focus on single-player or two-player for simplicity.

Overall Flow: New game candidates are generated by the evolutionary engine and compiled/executed in the kernel. The simulation engine runs automated play tests, and the evaluation module computes metrics and filters out broken games. Potentially interesting games are then either further evolved (if purely automated criteria suffice) or presented via the interface for human playtesting and preference comparisons. Human feedback is then used to update the fitness model, guiding the next generation of the evolutionary search. This iterative loop continues, gradually producing games that score better on both the automated proxies and the human’s own fun criteria.

## 2. Game Design DSL (Domain-Specific Language)

Goals and Philosophy: The DSL defines games in terms of atomic, composable primitives, rather than high-level concepts like “cards” or “hit points.” This ensures flexibility: concrete features such as a health meter or a deck of cards can emerge from combinations of primitives rather than being hardcoded. The DSL serves as the “genome” for the evolutionary algorithm – it must be compact and well-structured (to allow meaningful mutations), yet expressive enough to cover a wide space of tabletop game mechanics. We use a typed grammar / AST approach: game definitions are syntax-checked and type-checked, and evolutionary operations manipulate the AST nodes (not raw free-form text). This guarantees that every mutated candidate is at least syntactically valid and respects basic semantic constraints.

DSL Structure: A game description in the DSL consists of several sections, which collectively describe the game state and ruleset:

### State Definition

A list of state variables and entities that make up the game’s mutable state. Each state variable has a name, a type, and bounds or allowed values. Supported types include:

Integer (with a bounded range, e.g. int[-N..N]) – can represent resources, counters, points, etc. All integers are clamped within defined bounds.

Boolean – can represent binary flags or status (e.g. is an effect active).

Enum (finite enumerated types) – can represent statuses with multiple values or categorical variables (e.g. ZoneType = {Deck, Hand, Board}).

Token/Entity types: Complex game pieces composed of attributes (which are themselves variables of the above types) and possibly an identity. Tokens can reside in zones (see below) and can model cards, units, tiles, etc. Example: A token type Monster might have attributes like HP (an int) and Strength (int), etc.

Zones: Containers or collections of tokens. Zones can model locations such as a player’s hand, a draw deck, a discard pile, or a spatial board. The DSL can mark zone properties: e.g. an ordered zone (like a deck where draw order matters), an unordered zone (like a pool), a private zone (hidden from other players, like a hand), or a spatial zone (with slots connected in a graph, modeling a board map). By combining token definitions with zones, the DSL can express either card-game style areas (cards moving from deck to hand to discard) or board-game areas (tokens placed on a graph of board nodes), without ever using those exact words in the kernel – these emerge from the configuration. Relations between tokens (attachment, adjacency, containment) can also be expressed as needed.

### Agents (Players)

The game definition specifies the number of agents (players) N and optionally any asymmetry between them. N can be 1 (solo game), or higher for multi-player. The DSL might allow defining roles or teams, but fundamentally the kernel just treats agents as indices 1..N. Payoffs (win/lose conditions or scores) are defined per agent, enabling cooperative games (shared payoff or identical win condition for all) or competitive games (distinct outcomes). For example, a coop game might have a single win condition that applies to all players vs. an environment, whereas a competitive game could have each player trying to maximize their own score. By making player count a parameter of the game definition, the DSL does not hardcode any specific number – however, for evolutionary evaluation, games of different player counts might be handled in separate niches for fairness.

### Actions

An action represents a legal move or operation that can change the game state. Actions are the core of gameplay. Each action in the DSL is defined by:

Name (optional, for reference) and the agent(s) who can perform it (could be tied to “any player” or a specific role, or even an automated environment action if modeling random events).

Precondition: a Boolean logic expression over the current state that must be true for the action to be legal. Preconditions can check values of state variables, presence/absence of tokens, comparisons, etc. (e.g. ammo > 0 could be a precondition for a “Shoot” action). Complex conditions can be built with logical operators (AND, OR, NOT) and comparisons.

Cost: an optional set of state changes that represent the “cost” or resource expenditure of the action. Costs are usually subtractive effects applied before or as part of the action. For instance, an action might have a cost of energy -= 1 meaning it consumes one energy point. Costs ensure trade-offs (no free, unlimited actions).

Effects: the state transitions that occur when the action is executed. Effects are defined as a list of primitive operations that modify state. These primitives include: modifying a variable by some delta (increment/decrement), setting a variable to a value, moving a token from one zone to another, creating or destroying a token (spawn a new piece, remove a piece), revealing or hiding a token’s information (to simulate drawing a card or fog of war), or invoking randomness (like random choice from a distribution or deck shuffle). The DSL ensures effects are bounded (e.g. you cannot create infinite tokens or unbounded resources in one effect without limit) – any random generation or spawn must respect limits (like total tokens ≤ some cap). Effects can also include calls to subroutines or triggers (for example, an effect might say “deal 3 damage to each enemy” which conceptually loops over entities).

Target Selection: Many actions need a target (e.g. “Attack [target monster]”). The DSL allows parameterizing actions with target selectors, such as “choose a token in zone X meeting condition Y” or “choose a player” or “select a random card from hand”. Target rules ensure that actions remain generic – e.g. a “draw” action might target the top card of the deck zone.

Metadata (Optional): Actions can have tags like phase (which turn phase they can be used in), or speed (instant, reaction, etc.), or other annotations if needed in future. Initially, actions are assumed to be discrete choices available on a player’s turn.

### Turn Structure

The DSL specifies how turns progress. By default, it assumes a turn-based loop. The structure can be parameterized by:

Turn order / scheduler: e.g. simple round-robin through players in order, or more complex (phase-based or priority-based) scheduling. The DSL might allow specifying a turn order rule – for example, all players take turns in sequence (standard) or simultaneous turns with a resolution phase, etc.

Phases: A turn can be divided into phases (e.g. “Upkeep Phase”, “Main Phase”, “End Phase”). The DSL lets actions be restricted to certain phases. It also allows upkeep rules – automatic effects that happen at a phase boundary (like “at start of turn: draw 1 card” or “at end of turn: reduce timer by 1”).

For simplicity, the initial kernel might implement a fixed round-robin turn order with a single main phase per player, and allow the DSL to define any automatic step (like a “between turns” event). This can be extended later to more complex scheduling.

### Termination Conditions

Every game must specify how it ends. The DSL requires at least one win condition or loss condition (or more generally, an end-state condition). Termination conditions are Boolean expressions over the state that signal game over. Examples: “health <= 0” could trigger a loss, or “threat_level >= 10” ends the game, or “all goal tokens collected” wins the game. For multi-agent games, termination may assign different outcomes to different players (win/lose per agent). In cooperative or solo games, typically a single condition defines a win for all or loss for all. We also allow a max turn limit as a failsafe – e.g. if no other condition is met by 30 turns, the game ends in a draw or loss. This ensures finite length. The DSL syntax might include a section like MaxTurns = 30 or implicitly enforce a default cap if not specified.

Optionally, a scoring function can be provided for games that end without a clear win/loss (e.g. competitive games where highest score wins). The score function would map a terminal state to a numeric payoff for each player.

### Triggers and Events

To support richer game dynamics, the DSL includes the ability to define triggered rules. These are condition-effect pairs that automatically execute when certain events happen. For example: “When a monster is killed, increase XP by 1” could be a trigger, or “After a card is drawn, if hand size > 5 then discard down to 5”. Triggers can hook into events like “start of turn”, “end of turn”, “after action X is taken”, or state-based events like “when variable Y reaches 0”. Under the hood, triggers are similar to automatic actions conditioned on events, and are processed by the kernel whenever their condition is satisfied. They help model ongoing effects or complex card text. The DSL ensures triggers can’t create infinite loops – e.g. by not immediately re-triggering themselves endlessly (or by detection of such patterns).

Syntax and Notation: The DSL can be implemented in a textual format (.game files) or as a structured data (JSON/YAML). A textual DSL might look like a small declarative language; for example:

Players: 2
State:
  int health[0..10] = 10  // a health resource for each player, starting at 10
  zone Deck<card>, zone Hand<card>, zone Discard<card>
Actions:
  DrawCard:
    precondition: Deck.count > 0
    effect: move 1 card from Deck to Hand (target=self) 
            // (self refers to the acting player’s zones)
  Attack:
    precondition: enemy.health > 0 && handHas("WeaponCard")
    cost: discard 1 "WeaponCard" from Hand
    effect: enemy.health -= 3
Termination:
  lose_condition: health <= 0        // if any player’s health hits 0, they lose
  win_condition: opponent.health <= 0 // opponent health 0 means current player wins
  max_turns: 30

  This is an illustrative snippet (actual syntax may differ), showing how a two-player card game might be encoded with just primitives (zones, moves, variables). Typing is enforced (e.g. health is int with bounds, zones are typed to contain card tokens, etc.). The DSL’s grammar will be defined such that only valid combinations of these statements can be written.

  Composability and Constraints: The design of the DSL emphasizes that complex concepts arise by composition of simpler ones. For instance, the notion of a “deck of cards” is realized by defining a zone with an ordered list of token objects and an action that moves a token from that zone to a player’s hand. “Health” is just an integer variable that might be decremented by some actions and checked in termination conditions. This approach maximizes the generative space: evolution might try games with many small resources, or a single combined resource, with or without zones, etc., to see what works.

  However, not every combination of primitives will make sense – the DSL and the evolutionary system include composition rules and checks to avoid nonsense:

  Every game must have at least one termination condition (to avoid endless games).

Variables or tokens created in state must be used by some action or condition (to avoid useless elements bloating designs).

Costs and effects are checked for balance: e.g. you cannot define an action that only increases all positive resources with no downside (the “no free lunch” rule) without expecting a heavy penalty.

Illegal combinations (like moving a token to a zone it doesn’t belong, or targeting an invalid entity) are prevented by the type system or runtime checks.

The grammar enforces that an action’s preconditions refer to existing state elements and that effects likewise refer to defined variables/tokens.

The DSL might restrict certain operations to maintain analyzability: for example, no arbitrary arithmetic – only allowed operations like increment/decrement by constants or set to a constant (ensuring state updates are predictable and bounded).

Extensibility: The DSL is designed to be extensible. New primitives or rule constructs can be added as needed (for example, if later we want to incorporate a “trading” action between players, or area-of-effect damage, etc.). The system’s modular kernel means as long as the new primitive can be executed and fits into the state->action->effect model, it can be integrated. The implementation will likely maintain the DSL as a grammar definition (for parsing) and an AST structure. Evolutionary operations (mutation) will manipulate the AST (e.g. randomly add a new action node, or tweak a condition expression). By evolving the AST directly, we ensure we’re always generating syntactically valid games.

## 3. Formal Invariants and Safety Constraints

Any game generated by the system must satisfy a set of invariants and constraints that guarantee the game is well-formed, finite, and meaningful. These are enforced either by construction (the DSL grammar) or by post-generation validation. Key invariants include:

Finite Termination: Every game must eventually end in a finite number of turns. The game definition must include at least one condition that guarantees an absorbing terminal state (win, loss, or draw) will be reached. To ensure this, the system may impose a global turn limit on all games (e.g. if turn count exceeds 100 or a specified max, the game ends automatically). Additionally, game rules should not permit indefinite loops. For example, a sequence of actions that returns the game to the same state with the same player to move would cause infinite play; a loop detector will identify and break such loops (declaring a draw or applying a penalty if detected). The invariant is that from any reachable state, there is no infinite path of legal moves. Formally, the state-transition graph of the game (under the rules) must not contain cycles that can be traversed forever.

Bounded State Space: All state variables and collections must be bounded. Integers have fixed min/max limits, and no mechanism in the rules can cause an unbounded growth (e.g. endlessly spawning tokens without limit). The number of tokens, zones, or any dynamic elements is constrained by either explicit limits or by implicit resource scarcity. This prevents runaway state explosion and ensures the state space is finite. The DSL and kernel enforce clamping of numeric values and will refuse actions that would violate bounds (or treat them as invalid). A bounded state is critical both for practical simulation and to guarantee termination (since if state space is finite and no infinite cycles as above, termination follows).

No Dominant Trivial Strategy: The system avoids generating games with a single trivial action or strategy that always wins. In other words, there should be meaningful decision-making and trade-offs required to win; no “press this one button to always win in one turn” designs. This is partly enforced by requiring costs/trade-offs in powerful actions (no action can unconditionally increase all “good” variables or immediately fulfill win conditions without some counter-effect or limitation). The “no free lunch” rule means any beneficial effect must typically come with a cost or allow an opponent/environment to respond. As a safety check, the evaluation will flag games where one move immediately triggers a win from the initial state or a move that has strictly positive payoff with no drawback – those are either removed or heavily penalized in fitness. Additionally, if simulation shows one deterministic sequence of moves always leads to victory (with no variance or alternative successful lines), the game is considered degenerate. The invariant is that a game should require at least some non-trivial choices; there should be multiple viable actions or strategies, not one obvious forced script from start to finish.

No Unwinnable or Stalemate Games: Conversely, the system filters out games that are unwinnable or lead to deadlock. For example, a game where neither player can ever meet the win condition or a solo game where the lose condition will inevitably trigger before any win is possible. This is ensured by checking that win conditions are reachable from the initial state and that there is no permanent stalemate (e.g. both players have no actions that progress state). The loop/stalemate detector will terminate games that get stuck in repeating states or where no progress toward termination has been made in a certain number of turns. Such designs would get a low fitness or be discarded.

Consistency and Validity: All generated rulesets must be internally consistent. This means no undefined references (e.g., an action refers to a variable that doesn’t exist), no contradictory rules (e.g., two triggers that directly undo each other continuously), and no rules that violate the DSL’s type system (e.g., trying to add a token to an integer – not possible by grammar). The DSL’s type checking and grammar ensure most of this at compile time. Additionally, the initial state of the game should not violate any preconditions (e.g., if an action assumes a token exists, the initial state should either have it or that action is actually never legal – which might be fine if it’s meant to be conditional). The system might enforce that each action is potentially executable in some reachable state (to avoid including completely dead actions that never fire).

Controlled Complexity: To keep the search tractable and games understandable, there are constraints on the complexity of any single game’s ruleset. For example, a cap on the number of state variables, the number of distinct action definitions, and the depth/complexity of conditions (like how many clauses in a precondition). These limits act as regularizers, preventing the evolution from creating bloated, overly complex games that are hard to analyze or play. If a candidate exceeds complexity limits, it can be pruned or penalized. Complexity constraints can gradually relax over time as needed, but initial evolution starts with simpler games (small state, few actions) to ensure a manageable search space.

Security/Safety: (If applicable) Since the DSL could be executed in code, we ensure it cannot perform unsafe operations outside the game scope (especially if user input DSLs are run). However, as this is a closed system (not arbitrary code execution, just our defined primitives), this is inherently safe. We also guard against pathological cases (like intentionally trying to overflow an integer – which is prevented by clamping, etc.).

These invariants are enforced at multiple levels: The DSL grammar/type system prevents many forms of nonsense at definition time, a static analyzer (next section) catches deeper logical issues, and runtime monitoring during simulation catches any emergent issues (like loops). The net effect is that any game that passes through to human evaluation will have a reasonable guarantee of being playable, finite, and not immediately broken.

## 4. Testing Strategies and Automated Filters

Given the enormous space of possible game designs, robust testing and filtering is essential to identify unplayable or uninteresting prototypes quickly. The system employs both static analysis of the game definitions and dynamic simulation-based testing to automatically cull games that violate the above constraints or are otherwise “broken” or trivial.

#### A. Static Analysis (Compile-Time Checks):

When a new game candidate is generated (or mutated), the first step is to run a static checker that analyzes the DSL code/AST without executing the game. This toolchain will:

Validate Syntax and Types: Ensure the DSL is correctly formed and all references resolve. This step catches undefined variables, type mismatches (e.g., treating a boolean as a number), missing required sections (like no termination condition), etc. It’s essentially a compilation pass for the DSL.

Rule Consistency Checks: The analyzer looks for logical issues such as:

Impossible Preconditions: If an action’s precondition is logically unsatisfiable (perhaps due to contradictory clauses), flag or remove that action. E.g., if an action requires X > 5 and X < 3 at the same time, it can never fire.

Dead Variables/Actions: Identify state elements that are never used or actions that can never become legal. These don’t immediately invalidate a game, but they add noise. The system might remove them or penalize the game’s complexity score for having superfluous parts.

Dominance/Duplication: Check if there are actions that dominate others by design. For instance, if two actions have the same precondition but one yields strictly better effects (and no additional cost), then the inferior action is essentially obsolete. That indicates a redundancy or balance issue. The static tool can try to detect simple cases of this (although some dominance might only be evident via simulation). If found, it may either merge them or mark the game as having a trivial choice.

Infinite Loops in Rules: Detect self-referential triggers or effects that could cause an immediate infinite loop. For example, a trigger “when X happens, do Y” and Y immediately causes X again. Or two triggers that call each other. Such patterns can sometimes be caught by analyzing the dependency graph of state changes and triggers. The static analyzer will flag circular rule dependencies that have no delay or condition to break the loop.

Resource Balance Check: Ensure that for every resource that can be incremented, there is some rule or condition that can decrement it or limit it (unless it’s intended as a cumulative score). For every token that can spawn, ensure there’s a way it’s removed or a cap. This ensures no uncontrolled growth (ties into bounded state invariant).

Terminal Condition Reachability: Do a simple check that the termination conditions aren’t obviously unreachable. For example, if a win condition requires a variable to hit 100 but the variable’s max is 50, that’s a problem. Or a condition requiring all tokens of a type to be removed, but there are none to start with (though that could mean immediate win, which should also be checked if that is intended or a trivial game).

Any game that fails these static checks is filtered out or repaired (if a minor issue). These checks are extremely fast compared to full simulation, so they serve as the first line of defense to eliminate nonsensical designs.

### B. Simulation-Based Testing (Automated Playthroughs):

For games that pass static validation, the next step is to simulate gameplay to evaluate playability and quality:

#### Random/Heuristic Self-Play

The system will simulate a number of matches of the candidate game using the Simulation Engine and simple AI agents. Initially, agents might play random legal moves to explore the state space broadly. We can also use a few preset heuristic policies to see how different play styles fare (for example, an aggressive vs. conservative strategy as mentioned earlier). The result of these simulations yields data like: did the game end (and in how many turns), what were the final scores, how often certain actions were used, etc.

#### Metrics Collection

From these playthroughs, the system computes the suite of metrics described in Section 1 (Evaluation): distribution of game lengths, win-rate fairness between first/second player (if 2-player), branching factor (average number of legal moves per state), how often states repeat, and so on. These metrics are used to judge if the game is broken or trivial:

If game never terminates in simulation or frequently hits the turn cap without a winner, that’s a red flag for a likely broken (non-terminating) game.

If one agent wins almost 100% of the time regardless of starting conditions or if one sequence of actions always wins, it indicates a dominant strategy or imbalance – likely a trivial/deterministic game.

If players frequently have no choice (e.g., always exactly one legal move each turn), or if moves have no impact on outcome, that indicates a lack of meaningful decisions.

If random simulations produce extremely similar trajectories every time (very low entropy), the game might be too solved or too simple.

Degeneracy detection: We specifically look for loops or stagnation: e.g., agents cycling through the same states (suggesting a stall) or states where neither can progress. A high rate of repeated states triggers the loop/stalemate detector to mark the design as flawed.

Dominance detection: As an automated heuristic, if an action is used in an overwhelming majority of winning simulations to the exclusion of others, it might be dominating the game. Or if one strategy (like always take Action A) results in victory > some threshold of times, the game might be too one-dimensional. This echoes the “always strictly better” dominance check from static analysis, but validated in gameplay.

Interaction and Fun Proxies: Metrics like how often players interact or how close games are can hint if the game is at least somewhat engaging. For example, if one player always wins by a large margin and the other never has a chance, that’s not fun (one-sided).

#### Automated Filtering Criteria

The system sets thresholds for these metrics to decide if a game is worth keeping. For instance, discard any game where >50% of random simulations hit the max turn limit without ending (too likely to stalemate). Or discard games where the first player wins >90% (balance issue), unless intentional. Or discard games that end in under 3 turns nearly always (might be too trivial, unless we specifically evolve ultra-fast microgames). Also throw away games where a significant fraction of simulation steps are “skip” or “no-ops” (indicating dead turns or lack of tension). The idea is to “throw away 95% automatically (degenerate / shallow / unreadable)” before involving a human. Indeed, the conversation suggests that the vast majority of generated games will be junk that should be filtered out by these automated checks so that only promising prototypes reach human evaluation.

#### Coverage and State Exploration

Another testing strategy is to attempt to map out the reachable state space of the game. By doing many random plays (or even using an explorer algorithm), we gather unique states visited. If large portions of the defined state (e.g. certain variables or actions) are never encountered, that indicates either those elements are redundant or the game’s probability space is very narrow. This might inspire either penalizing complexity (for unused parts) or highlighting potential design issues (maybe an action’s precondition is too strict to ever happen). We might generate a state coverage report: which combinations of state variables values were seen, which actions fired how often, etc. Unreachable code or states can then be pruned.

### C. Human-Like Rule Checks

Some trivial or broken designs might slip past purely algorithmic checks because they technically terminate and have some choices, but are still “unfun” in obvious ways. While the ultimate fun judgement is deferred to human preference (Section 6), we can implement a few heuristic filters, such as:

Nonsense Theme Check (if any): Since the DSL is abstract, thematic coherence isn’t enforced (and not strictly necessary for mechanics). But if desired, one could filter out games with too many disconnected parts (e.g. a game that has 10 different resources that don’t interact might be considered noise). This is more subjective, so initially the focus is on mechanical soundness.

Trivial Objective: If the win condition is something the player can do on the first turn with no opposition, that’s trivial. For example, win condition “if you have ≥0 health you win” is immediately true. The static check or a single-step simulation would catch that (game ends immediately with no play).

Symmetry/Redundancy: If the game defines multiple players but in effect only one player has actions (others can’t do anything meaningful), it might be effectively a solitaire game with dummy players – could flag that as odd design (though not strictly invalid).

All these tests produce either a pass/fail or a set of warnings. The evolutionary algorithm integrates these as constraints/penalties in the fitness function. Candidates that fail hard constraints (like no termination) are outright rejected (fitness -∞). Candidates that are valid but have, say, very low meaningful-choices metric will get a low fitness, so they won’t be selected for reproduction.

Automated Balancing Feedback: Beyond filtering out broken games, the data from testing can feed back into the design. For example, if the analysis finds that “Action X is never used” or “variable Y never changes”, the system could attempt a mutation specifically to fix that (like remove or tweak that element). Or if it finds “games ending too early”, it might suggest increasing some resource thresholds via mutation. These are more advanced uses, essentially turning the analysis into a guide for targeted evolution (e.g., similar to how analytics can propose new cards or effects).

## 5. Technology and Implementation Choices

Building this system requires selecting technologies for the DSL implementation, evolutionary computation, simulation, and user interface. Below are recommended choices and alternatives, emphasizing performance, flexibility in AST manipulation, and ease of integration:

### Language and Runtime

A strong candidate is Python for its rich ecosystem in prototyping DSLs, evolutionary algorithms, and machine learning (for the preference model). Python has libraries like lark or PLY for writing parsers, and deap or ecpy for evolutionary algorithms. Its dynamism makes AST manipulation straightforward (e.g., representing game definitions as nested dicts or dataclasses). However, Python may be slow for simulating thousands of games. An alternative is JavaScript/TypeScript, which can run either on a server (Node.js) or even in-browser. TypeScript provides type safety for the game structures, and libraries like peg.js or nearley can define the DSL grammar. The advantage of JS is that a text-based web interface could be built easily, and performance in modern V8 engines is decent. For intensive simulation, one could consider a hybrid approach: implement the core simulation kernel in a compiled language like Rust or C++ for speed, and expose it as a library (via FFI or WebAssembly) to the higher-level environment that handles evolution and UI. Given the complexity, a pragmatic route is to start in Python for development speed and later optimize bottlenecks (perhaps by rewriting the inner loop of the simulation in C or using PyPy).

Note by reviewer: Python is way too slow in our experience. Javascript should likely be used for must of the code, and perhaps the kernel should be written in a compiled language if necessary (if we truly need that speed).

### DSL Implementation

Initially, the DSL could be defined in a JSON or YAML format to avoid writing a full parser. For example, one could represent the game as a JSON object with keys "state": {...}, "actions": [...], "termination": {...}. This would simplify reading/writing game definitions and allow using standard JSON diff/manipulation for mutations. As the project matures, a more human-readable DSL syntax can be created with a parser. If using a parser generator:

For Python, Lark or ANTLR (with Python target) can be used to parse the DSL into an AST.

For JavaScript, PEG.js, Nearley, or ANTLR (JavaScript target) can do similarly.

The AST can be a custom class hierarchy or just nested dictionaries. The key requirement is that it’s easy to traverse and modify (e.g., to perform a mutation like “add a random new action” or “change the threshold in a win condition”).

Typing: Enforce types in the AST (e.g., have a structure where each variable node knows its type and bounds, each action node ensures its precondition is a valid boolean expression referencing existing variables, etc.). A static type checker module will walk the AST to enforce this.

Serialization: The ability to serialize/deserialize the game definitions (to save interesting designs or to send them for human playtesting) is important. JSON covers this if used; if a custom syntax, we’d implement a pretty-printer as well.

### Simulation Engine

If using Python: implement the simulation as an iterative loop applying rules. Python’s object-oriented features allow modeling tokens, zones, etc., as objects or dicts. However, pure Python might be slow for the large number of simulations expected. It may be acceptable initially (with optimized algorithms and limiting game complexity), but consider using NumPy for vectorized state updates if analyzing many similar states, or using Cython to speed up the core loop.

If using JavaScript/TypeScript: implement the simulation in a functional style (pure functions for state transitions) or using classes for game state. JavaScript can handle the turn-based logic easily; performance is usually fine for thousands of short simulations, especially if using Node and possibly worker threads for parallelism.

In either case, it’s crucial to support resetting and copying game states quickly (for branching simulations or Monte Carlo). Designing the state representation with this in mind (like a state copy method that clones all variables and tokens efficiently) will be important.

Randomness: Use a controllable RNG (so results can be reproduced or varied systematically).

For AI players, one might integrate or implement simple algorithms. In Python, one can use libraries or write simple MCTS or min-max with limited depth for decision-making. In JS, one can write these or consider existing game AI libraries if any.

### Evolutionary Algorithm

Python has the DEAP library which is quite flexible for GA/GP (genetic programming) tasks – our evolving AST is akin to genetic programming, evolving programs/rules. DEAP can be used to define custom mutation/crossover on our genome class. Alternatively, one can implement custom evolution logic, which isn’t too complex given we need niche management (MAP-Elites) and integration with a learned model.

If pursuing the quality-diversity approach, look at libraries or reference implementations of MAP-Elites. Python has some QD research libraries (e.g., pyribs for MAP-Elites). Otherwise, implementing a grid of niches where each niche stores the best individual for certain feature ranges is feasible.

The evolutionary loop should be instrumented to allow interactive insertion of human evaluation (i.e., a human can pause the evolution and test certain individuals, or the system periodically asks for human comparisons).

If using JS, one might write the GA manually or use a simpler GA library (less common in JS, but there are a few basic ones). Because of the need for custom selection based on multiple criteria (fun prediction + diversity + constraints), a custom implementation might be easier.

### User Interface:

A text-based UI can be done in several ways:

A command-line interface (CLI) program (Python or Node) that prints the game state and prompts for input. Python’s readline or simply input() can work; Node can use packages like Inquirer.js to present menus of actions.

A web-based UI where the state and options are rendered in a webpage (could be plain HTML or using a framework like React if we want a nicer experience), and the user clicks buttons or enters text to choose actions. This can still be text-oriented (just presenting state as text and choices).

Even a chat-bot style interface (since the user initially engaged via ChatGPT) could be envisioned: the system could output the game state and actions as text in a chat, and the user responds with their action choice.

For ease, a CLI might be the fastest to implement. It should show all necessary info clearly – for example, list each player’s key resources, what tokens are where, etc., then list actions like:

Turn 5:
Your health: 3, Enemy health: 2, Deck: 4 cards, Hand: [Fireball, Shield], Discard: 2 cards.
Available actions:
  1. Play "Fireball" (deal 2 damage to Enemy, cost: discard 1 card)
  2. Play "Shield" (increase your defense, cost: 1 energy)
  3. End Turn
Choose an action (1-3):

This requires formatting the generic game state into human-readable form. We can leverage the DSL metadata to do this (for example, it knows about zones and can iterate them, knows variable names to print, etc.). For arbitrary games it might be tricky to generalize a perfect description, but we can at least list variable names/values and zone contents. This is an area to improve with possibly user-provided templates or simply default to raw listings.

The UI should also support the pairwise comparison queries for preference learning. This could be as simple as: after playing or simulating two games, ask the user “Which game did you find more fun, A or B?” and record the answer. Or ask them to rate aspects. A small web app might shine here by showing side-by-side summaries of two games (or their key metrics) and a voting button.

### Data and Model Integration

For the preference learning (Section 6), if using Python, libraries like scikit-learn or LightGBM can be used to train quick models (logistic regression, gradient boosting) on the feature vectors. If using JS, one could use TensorFlow.js or call an API, but probably easier to do on a Python backend. This suggests an architecture where maybe a Python backend does the heavy lifting (evolution, simulation, ML) and a lightweight frontend (could be CLI or web) interacts via requests or shared files. Alternatively, stick to one ecosystem (all Python CLI, or all Node with some ML library or a custom simple model).

If deep learning or more complex modeling is needed later, Python’s PyTorch or TensorFlow are readily available. In JavaScript, there is TensorFlow.js but it’s less convenient for quick training on arbitrary data.

### Performance Considerations:

Use parallelism where possible. Many games can be simulated in parallel threads or processes (since each candidate evaluation is independent). Python has multiprocessing (with caution for global RNG seeding, etc.), and Node.js can spawn worker threads. This will be vital when evaluating large populations.

Consider compiling frequently-used rule checks. For example, a game’s rules could be JIT-compiled to a Python function or JS function for faster execution rather than interpreted each step. This could be done by generating Python/JS code from the DSL AST (basically transpiling DSL to a program) and then exec/evaluate it. However, correctness first, optimization later.

Monitor memory usage: storing entire trajectories of every simulation might be heavy; instead compute metrics on the fly or sample strategically.

Given the system may iterate hundreds of generations with dozens of candidates each, each requiring dozens of simulations, optimize the simulation but also remember that the search can be guided to avoid too expensive evaluations. For example, if a game is identified as complex (tons of actions, etc.), maybe run fewer simulations for it or drop it early due to a complexity penalty.

In summary, Python is recommended for its ecosystem and easier ML integration (especially for the preference model), with possible optimization via compiled extensions. TypeScript/Node.js is an alternative if the user prefers a single-language solution and a web interface; it offers decent performance and good tools for building interactive interfaces. Whichever stack is chosen, design with modularity: the DSL and simulator as one module, the evolutionary logic as another, and the UI as a thin layer. This separation will allow swapping components (e.g., replacing the simulator with a faster version, or the GA with a different algorithm) without affecting the others.

## 6. Integration of User Preference Learning as a Fitness Function

To truly evolve games that are fun, the system must learn the designer’s (or target players’) preferences and use that as the optimization objective. We adopt a human-in-the-loop evolutionary process, where human feedback is periodically collected and used to train a model that predicts “fun” for a given game. This model then guides the evolutionary search. The approach is analogous to Reinforcement Learning from Human Feedback (RLHF) but applied to game design selection.

### Step 1: Initial Automated Phase

Initially, evolution will optimize based on the automated metrics (the “fun-vector” proxies). This generates a pool of viable candidates that are mechanically sound and diverse (as ensured by the filters). At this stage, the fitness might be a weighted sum of proxy metrics – for example, rewarding games that have high agency, balanced win rates, moderate length, etc., according to general good design principles. However, these weights are guesswork; they don’t directly encode your fun. So this phase is mainly to eliminate junk and get a variety of semi-decent candidates.

### Step 2: Human Preference Data Collection

The system then engages the user (or a group of play-testers) to evaluate games. Directly asking for a numeric “fun” score is hard (subjective and variable) – instead, the system uses pairwise comparisons. It will present Game A vs Game B (either as descriptions, simulation replays, or brief play sessions for each) and ask: “Which prototype is more fun?”. The user might also provide a reason or tag (e.g. “A was too random, B was more strategic”). These comparisons are much easier for humans and yield relative preference data.

Implementation: The system might schedule, say, 20 pairwise match-ups among the current top candidates or diverse candidates. The UI will let the user try those games (perhaps in a shortened form – e.g., play 5 minutes of each or watch an AI play them for a few turns) and then input their choice of which they preferred. Each comparison is a data point.

### Step 3: Train Preference Model:

Using the collected comparisons, the system trains a model to predict the probability that the user will prefer game X over game Y. This can be done with:

A Bradley–Terry model or Elo rating approach, which treats each game as having an underlying score and finds values that best fit the win/loss preferences.

Or a binary classifier/regressor that takes as input the feature vector of a game (the metrics we compute) and outputs a “fun score”. Potential models include logistic regression, a decision tree or gradient-boosted trees, or a small neural network – given the vector of game metrics and perhaps some game parameters, predict a scalar fun rating.

The model training will use the pairwise data; for example, if A was preferred to B, the training adjusts weights such that model(A) > model(B). If enough data, one can even predict by how much or with what confidence.

This model essentially tries to approximate the user’s utility function over the game design space. We acknowledge that fun is subjective and multi-dimensional, but since we focus on one person (the designer) or a specific audience, we treat their feedback as ground truth to learn from.

After training, we now have a learned fitness function: given a new game’s features, it can predict how fun the user would find it (or rather, a score correlated to that).

### Step 4: Evolution with Learned Fitness

The evolutionary engine now uses this preference model as the primary fitness evaluator. That is, instead of optimizing the raw proxy metrics, it uses the model’s predicted fun score to select and generate new candidates. Essentially, we are steering the search towards regions of design space that the model believes the user will prefer. This allows the search to explore creatively while being aligned to the user’s tastes, without requiring the user to test every single game.

In practice: For each candidate, we still simulate to get its feature vector. We feed that to the preference model, which gives a predicted preference score. Evolution (GA) then selects higher-scoring designs to breed. We maintain some elitism and diversity to avoid converging too fast or getting stuck in a local optimum.

Active Learning: The system should continue to refine the preference model. As evolution produces novel games that perhaps extrapolate beyond the initial data, the model will have uncertainty. The system can periodically ask the user to compare certain games where the model is unsure or disagreeing with the proxy metrics. This could be done by monitoring the model’s confidence or simply every N generations do another round of comparisons with some newly evolved games. By focusing on comparisons the model finds ambiguous, we maximize the information gain from each query.

Over time, the preference model becomes more accurate in representing the user’s fun criteria, and the evolved games become more and more aligned with those criteria.

### Step 5: Multi-objective and Safeguards

Optimizing a learned model can lead to overshooting or exploiting quirks of the model (a form of Goodhart’s Law where optimizing the proxy ruins the actual goal). Two main issues to watch:

The model is only an approximation; if we push it to extremes, the designs found might exploit false correlations in the model that don’t actually delight the user (e.g., the model might think “lots of variety = fun” and produce a chaotic game that the user actually dislikes).

The user’s own preferences might drift or depend on context (“some days I prefer a quick game, other days something deeper”).

To mitigate these:

Keep hard constraints/penalties for known degeneracies in the fitness. Even if the model is fooled into liking a game that has an infinite loop, the system should reject it via the invariant checks (Section 3) and explicit penalties for things like loops, non-interactivity, etc..

Use novelty or quality-diversity mechanisms alongside the preference score. For instance, maintain a diverse set of top games so that the algorithm doesn’t converge to a very narrow type of game (which might just be overfitting the model’s current idea of fun). An archive of diverse high-scoring designs can be kept, and evolution is encouraged to fill different niches (with diversity measured by descriptors like those in Section 1).

Periodic human re-calibration: Continue gathering preference data even as the model is used. The active learning loop (asking about uncertain comparisons) ensures the model stays up-to-date. If the user’s mood or preference changes (maybe one day they realize they want a bit more randomness), new comparisons can capture that. We can also allow the user to specify a “mode” or context for fun – e.g., “today I want a light quick game” vs “I want a deep thinky game”, and include that as an input to the model. This could evolve into training separate models for different play contexts or objectives, and selecting which to optimize at a given time.

Essentially, we treat the preference model as a continuously learning component, not a one-and-done. The minimal viable implementation might just do one round of model training and use it, but scaling up means integrating this as an ongoing feedback loop.

### Minimum Viable Path

In an initial prototype, we might do the following simplified approach:

Constrain the design space to a very small microgame format (as suggested, e.g., a solo game with 2 resources and ~20 cards/actions). This makes it easier to evaluate and for the user to give feedback rapidly.

Generate a batch of, say, 10 game variants. Simulate each quickly and ensure they at least function.

Have the user play or watch each briefly (or do pairwise comparisons among them) and rank them.

Use a simple algorithm (even just Elo ranking or averaging the user’s ranking) to identify the top 2-3 and worst 2-3.

Use that feedback to manually or automatically tweak the next generation (e.g., bias towards elements present in the top games, eliminate elements common in the worst games).

This can validate the concept of learning preferences before investing in complex modeling. Then scale up by formalizing the model training as above and automating the GA loops.

### Scaling Up

As more data is gathered (the user tests dozens of games), the preference model can shift from a simple linear model to a more complex one (if needed) to capture nonlinear interactions between features. We could incorporate more features, including possibly direct measurements from human gameplay (like did the user smile or curse – if such data were available – but that’s beyond scope). If targeting a broader audience, we could aggregate preference data from multiple people and either specialize per user or find a consensus fun score (though consensus fun is tricky – better to segment the audience and perhaps evolve different games for different tastes).

In essence, user preference learning turns the evolutionary search from blindly maximizing proxy metrics to maximizing what the user actually cares about. By keeping the user “in the loop” in small, efficient ways (pairwise choices, brief playtests), we steer the algorithm toward truly fun game designs, not just those that look good on paper. Over time, the system should be able to surprise the user with novel games that they indeed enjoy – effectively co-designing with the AI, where the AI handles the heavy lifting of searching combinatorial design space, and the human provides the aesthetic judgment and fun sense that guides that search.

## Conclusion

This specification outlined a comprehensive design for a system that evolves playable tabletop game prototypes using atomic primitives in a DSL. We described an architecture that balances general-purpose flexibility (a universal game kernel that doesn’t hardcode genre assumptions) with pragmatic constraints (to ensure games are finite, bounded, and comparable). The DSL design encourages emergence of familiar constructs (cards, health, etc.) from fundamental building blocks, maximizing the creative space. We established formal safety invariants to guard against degenerate games and proposed multi-layer testing (static and dynamic) to automatically filter out unplayable or trivial designs. The technology stack is chosen to facilitate rapid development and iteration (leveraging existing languages and libraries for parsing, simulation, and machine learning). Finally, we detailed a plan for integrating human preference learning so that the system optimizes for fun, not just surrogate metrics – using pairwise comparisons to train a model of the designer’s tastes, and using that model to drive evolution in a scalable way.

This approach is optimized for evolvability and fast iteration: starting from a minimal kernel and gradually expanding the DSL as needed, the system can begin generating and testing microgames quickly. By not baking in early assumptions about what games should have, we keep the generative space as open as possible, only constrained by what’s necessary for practicality. As a result, the system can explore a wide variety of game designs – from solo puzzle-like games to multi-player strategy games – all within one framework. And as the preference model becomes more sophisticated, the system will increasingly propose designs that are not just mechanically sound, but aligned with the elusive qualities of fun as defined by the human in the loop.

With this spec in hand, the next steps would be implementation of the DSL interpreter and a simple evolutionary loop, followed by incremental integration of the advanced components (analytics, preference learning). The ultimate deliverable is a platform where one can press a button to “breed” new games, test them, and gradually hone in on games that deliver the desired player experience – a cutting-edge tool for game designers and researchers alike.