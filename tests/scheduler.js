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

  const ordered = [...followers].sort((a, b) => a.startMs - b.startMs);
  const moves = [];
  let skippedFixed = 0;
  let skippedConflict = 0;
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

    const hasConflict =
      protectExternalConflicts &&
      follower.startMs !== newStartMs &&
      blockers.some((b) => rangesOverlap(newStartMs, newEndMs, b.startMs, b.endMs));

    if (hasConflict) {
      skippedConflict += 1;
      nextStartMs = Math.max(nextStartMs, follower.endMs);
      continue;
    }

    if (follower.startMs !== newStartMs) {
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
    skippedConflict
  };
}

module.exports = {
  planFollowerMoves
};
