const test = require("node:test");
const assert = require("node:assert/strict");
const { planFollowerMoves } = require("./scheduler");

const DAY = Date.UTC(2026, 2, 6);

test("moves followers in chronological order regardless of input order", () => {
  const result = planFollowerMoves(DAY + 9 * 60 * 60 * 1000, [
    {
      id: "b",
      startMs: DAY + 11 * 60 * 60 * 1000,
      endMs: DAY + 12 * 60 * 60 * 1000,
      tags: []
    },
    {
      id: "a",
      startMs: DAY + 10 * 60 * 60 * 1000,
      endMs: DAY + 10.5 * 60 * 60 * 1000,
      tags: []
    }
  ]);

  assert.equal(result.moved, 2);
  assert.deepEqual(result.moves.map((m) => m.id), ["a", "b"]);
  assert.equal(result.moves[0].toStartMs, DAY + 9 * 60 * 60 * 1000);
  assert.equal(result.moves[1].toStartMs, DAY + 9.5 * 60 * 60 * 1000);
});

test("skips fixed-tagged events and continues chain after fixed end", () => {
  const result = planFollowerMoves(DAY + 9 * 60 * 60 * 1000, [
    {
      id: "fixed",
      startMs: DAY + 9.5 * 60 * 60 * 1000,
      endMs: DAY + 10.5 * 60 * 60 * 1000,
      tags: ["#fixed"]
    },
    {
      id: "next",
      startMs: DAY + 10.25 * 60 * 60 * 1000,
      endMs: DAY + 11 * 60 * 60 * 1000,
      tags: []
    }
  ]);

  assert.equal(result.skippedFixed, 1);
  assert.equal(result.moved, 1);
  assert.equal(result.moves[0].id, "next");
  assert.equal(result.moves[0].toStartMs, DAY + 10.5 * 60 * 60 * 1000);
});

test("dry-run reports planned moves without applying", () => {
  const result = planFollowerMoves(
    DAY + 8 * 60 * 60 * 1000,
    [
      {
        id: "task",
        startMs: DAY + 9 * 60 * 60 * 1000,
        endMs: DAY + 10 * 60 * 60 * 1000,
        tags: []
      }
    ],
    { dryRun: true }
  );

  assert.equal(result.moved, 1);
  assert.equal(result.moves[0].applied, false);
});

test("skips move when proposed slot overlaps external blocker", () => {
  const result = planFollowerMoves(
    DAY + 9 * 60 * 60 * 1000,
    [
      {
        id: "focus",
        startMs: DAY + 12 * 60 * 60 * 1000,
        endMs: DAY + 13 * 60 * 60 * 1000,
        tags: []
      }
    ],
    {
      blockers: [
        {
          startMs: DAY + 9.5 * 60 * 60 * 1000,
          endMs: DAY + 10.5 * 60 * 60 * 1000
        }
      ]
    }
  );

  assert.equal(result.moved, 0);
  assert.equal(result.skippedConflict, 1);
});

test("can disable conflict protection to force move", () => {
  const result = planFollowerMoves(
    DAY + 9 * 60 * 60 * 1000,
    [
      {
        id: "focus",
        startMs: DAY + 12 * 60 * 60 * 1000,
        endMs: DAY + 13 * 60 * 60 * 1000,
        tags: []
      }
    ],
    {
      protectExternalConflicts: false,
      blockers: [
        {
          startMs: DAY + 9.5 * 60 * 60 * 1000,
          endMs: DAY + 10.5 * 60 * 60 * 1000
        }
      ]
    }
  );

  assert.equal(result.moved, 1);
  assert.equal(result.skippedConflict, 0);
});
