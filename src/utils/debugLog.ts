export function summarizeDebugEvents(events: string[]): string[] {
  const summarized: string[] = [];

  for (let index = 0; index < events.length;) {
    const event = events[index];
    if (!event) {
      index += 1;
      continue;
    }

    const match = getNoHitMatch(event);
    if (!match) {
      summarized.push(event);
      index += 1;
      continue;
    }

    let end = index + 1;
    while (end < events.length) {
      const next = events[end];
      const nextMatch = next ? getNoHitMatch(next) : null;
      if (
        !nextMatch ||
        nextMatch.usablePoses !== match.usablePoses ||
        nextMatch.horizontalCandidates !== match.horizontalCandidates ||
        nextMatch.status !== match.status
      ) {
        break;
      }
      end += 1;
    }

    if (end - index === 1) {
      summarized.push(event);
    } else {
      const lastEvent = events[end - 1] ?? event;
      const lastTimestamp = lastEvent.match(/^\[([^\]]+)\]/)?.[1] ?? match.timestamp;
      summarized.push(
        `[${match.timestamp}–${lastTimestamp}] WebXR hit-test repeated ${end - index}×: ` +
          `hits=0, usablePoses=${match.usablePoses}, ` +
          `horizontalCandidates=${match.horizontalCandidates}, status=${match.status}.`,
      );
    }
    index = end;
  }

  return summarized;
}

function getNoHitMatch(event: string) {
  const match = event.match(
    /^\[([^\]]+)\] WebXR hit-test: hits=0, usablePoses=(\d+), horizontalCandidates=(\d+), status=(.*?), viewer=/,
  );
  if (!match) return null;

  return {
    timestamp: match[1] ?? "",
    usablePoses: match[2] ?? "0",
    horizontalCandidates: match[3] ?? "0",
    status: (match[4] ?? "").replace(/\.$/, ""),
  };
}
