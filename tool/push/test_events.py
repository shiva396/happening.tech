from datetime import datetime, timezone
import unittest

from events import payload


class NotificationEligibility(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 28, 6, tzinfo=timezone.utc)
        self.groups = {"flutter-athens": "Flutter Athens"}
        self.event = {"title": "Flutter meetup", "start": "2026-12-17", "end": "2026-12-17",
                      "community_id": "flutter-athens", "timezone": "Europe/Athens", "attendance": "Online"}

    def notice(self, **changes):
        return payload("meetup", {**self.event, **changes}, self.now, self.groups)

    def test_online_event_references_organizer(self):
        self.assertEqual(self.notice()["body"], "2026-12-17 · Online · Flutter Athens")

    def test_cancelled_and_past_events_are_silent(self):
        self.assertIsNone(self.notice(status="cancelled"))
        self.assertIsNone(self.notice(end="2026-11-28T08:00:00+02:00"))
        self.assertIsNone(self.notice(end="2026-11-27"))
        self.assertIsNotNone(self.notice(end="2026-11-28"))

    def test_legacy_organizer_format(self):
        event = {"title": "A previous listing", "start": "2026-12-01", "end": "2026-12-01",
                 "timezone": "UTC", "city": "Chennai", "community": "Original organizer"}
        self.assertIn("Chennai · Original organizer", payload("legacy", event, self.now, {})["body"])
