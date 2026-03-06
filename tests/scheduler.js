function normalizeTag(tag) {
  const trimmed = String(tag || "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function hasAnyTag(tags, skipTags) {
  const set = new Set((tags || []).map(normalizeTag));
  return (skipTags || []).map(normalizeTag).some((tag) => set.has(tag));
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function planFollowerMoves(anchorEndMs, followers, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const skipTags = options.skipTags || ["#fixed"];
  const blockers = Array.isArray(options.blockers) ? options.blockers : [];
  const protectExternalConflicts =
    options.protectExternalConflicts === undefined ? true : Boolean(options.protectExternalConflicts);
  const maxMovesPerRun = Number.isInteger(options.maxMovesPerRun)
    ? Math.max(1, options.maxMovesPerRun)
    : Number.POSITIVE_INFINITY;

  const ordered = [...followers].sort((a, b) => a.startMs - b.startMs);
  const moves = [];
  let skippedFixed = 0;
  let skippedConflict = 0;
  let skippedMoveLimit = 0;
  let hitMoveLimit = false;
  let nextStartMs = anchorEndMs;

  for (const follower of ordered) {
    if (hasAnyTag(follower.tags, skipTags)) {
      skippedFixed += 1;
      nextStartMs = Math.max(nextStartMs, follower.endMs);
      continue;
    }

    const durationMs = follower.endMs - follower.startMs;
    const newStartMs = nextStartMs;
    const newEndMs = newStartMs + durationMs;
    const needsMove = follower.startMs !== newStartMs;

    if (needsMove && moves.length >= maxMovesPerRun) {
      skippedMoveLimit += 1;
      hitMoveLimit = true;
      break;
    }

    const hasConflict =
      protectExternalConflicts &&
      needsMove &&
      blockers.some((b) => rangesOverlap(newStartMs, newEndMs, b.startMs, b.endMs));

    if (hasConflict) {
      skippedConflict += 1;
      nextStartMs = Math.max(nextStartMs, follower.endMs);
      continue;
    }

    if (needsMove) {
      moves.push({
        id: follower.id,
        fromStartMs: follower.startMs,
        toStartMs: newStartMs,
        toEndMs: newEndMs,
        applied: !dryRun
      });
    }

    nextStartMs = newEndMs;
  }

  return {
    moves,
    moved: moves.length,
    skippedFixed,
    skippedConflict,
    skippedMoveLimit,
    hitMoveLimit
  };
}

module.exports = {
  planFollowerMoves,
  normalizeTag,
  hasAnyTag,
  rangesOverlap
};
