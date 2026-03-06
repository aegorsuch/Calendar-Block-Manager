function normalizeTag(tag) {
  const trimmed = String(tag || "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function hasAnyTag(tags, skipTags) {
  const set = new Set((tags || []).map(normalizeTag));
  return (skipTags || []).map(normalizeTag).some((tag) => set.has(tag));
}

function planFollowerMoves(anchorEndMs, followers, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const skipTags = options.skipTags || ["#fixed"];

  const ordered = [...followers].sort((a, b) => a.startMs - b.startMs);
  const moves = [];
  let skippedFixed = 0;
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
    skippedFixed
  };
}

module.exports = {
  planFollowerMoves
};
