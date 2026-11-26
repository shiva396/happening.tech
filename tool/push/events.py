"""Notify subscribers after newly listed events are published on Pages."""
import json
import os
import subprocess
import tomllib
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


def new_events(before, after, now):
    changes = subprocess.check_output([
        "git", "diff", "--name-only", "-z", "--find-renames", "--diff-filter=A",
        before, after, "--", "events/*.toml",
    ])
    for raw in changes.split(b"\0"):
        if not raw:
            continue
        path = Path(os.fsdecode(raw))
        with path.open("rb") as source:
            event = tomllib.load(source)
        end = event["end"]
        if len(end) == 10:
            ended = date.fromisoformat(end) < now.astimezone(ZoneInfo(event["timezone"])).date()
        else:
            ended = datetime.fromisoformat(end) <= now
        if not ended:
            yield path.stem, event


if __name__ == "__main__":
    events = new_events(os.environ["BEFORE_SHA"], os.environ["GITHUB_SHA"], datetime.now(timezone.utc))
    print(json.dumps([
        {"slug": slug, "title": event["title"],
         "body": f'{event["start"][:10]} · {event["city"]} · {event["community"]}'}
        for slug, event in events
    ]))
