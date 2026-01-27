import { readFile } from "node:fs/promises";

export const baseDefinition = JSON.parse(
  await readFile(new URL("../fixtures/dsl/valid/minimal.json", import.meta.url))
);

export const missingTerminationDefinition = JSON.parse(
  await readFile(
    new URL("../fixtures/dsl/invalid/missing-termination.json", import.meta.url)
  )
);

export const missingTerminationConditionsDefinition = JSON.parse(
  await readFile(
    new URL(
      "../fixtures/dsl/invalid/missing-termination-conditions.json",
      import.meta.url
    )
  )
);

export const missingMaxTurnsDefinition = JSON.parse(
  await readFile(
    new URL("../fixtures/dsl/invalid/missing-max-turns.json", import.meta.url)
  )
);

export const exampleDefinition = JSON.parse(
  await readFile(new URL("../../examples/dsl/minimal-game.json", import.meta.url))
);

export const dominantActionDefinition = JSON.parse(
  await readFile(
    new URL("../fixtures/dsl/invalid/dominant-action.json", import.meta.url)
  )
);

export const noMeaningfulActionsDefinition = JSON.parse(
  await readFile(
    new URL(
      "../fixtures/dsl/invalid/no-meaningful-actions.json",
      import.meta.url
    )
  )
);
