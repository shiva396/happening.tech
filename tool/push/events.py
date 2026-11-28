"""Notify subscribers when a newly published Flutter gathering is still relevant."""
import json
import os
import subprocess
import tomllib
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


def payload(slug, event, now, communities):
    if event.get("status") == "cancelled":
        return None
    end = event["end"]
    if len(end) == 10:
        ended = date.fromisoformat(end) < now.astimezone(ZoneInfo(event["timezone"])).date()
    else:
        ended = datetime.fromisoformat(end) <= now
    if ended:
        return None
    organizer = communities.get(event.get("community_id"), event.get("community", ""))
    location = "Online" if event.get("attendance") == "Online" else event.get("city")
    body = " · ".join(part for part in [event["start"][:10], location, organizer] if part)
    return {"slug": slug, "title": event["title"], "body": body}


def new_events(before, after, now):
    changes = subprocess.check_output([
        "git", "diff", "--name-only", "-z", "--find-renames", "--diff-filter=A",
        before, after, "--", "events/*.toml",
    ])
    communities = {}
    for path in Path("communities").glob("*.toml"):
        with path.open("rb") as source:
            communities[path.stem] = tomllib.load(source)["name"]
    for raw in changes.split(b"\0"):
        if raw:
            path = Path(os.fsdecode(raw))
            with path.open("rb") as source:
                notice = payload(path.stem, tomllib.load(source), now, communities)
            if notice is not None:
                yield notice


if __name__ == "__main__":
    events = new_events(os.environ["BEFORE_SHA"], os.environ["GITHUB_SHA"], datetime.now(timezone.utc))
    print(json.dumps(list(events)))
