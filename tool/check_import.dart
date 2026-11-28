import 'dart:io';
import 'package:flutter_spot/event.dart';
import 'package:toml/toml.dart';

import 'import_event.dart';

void check(bool ok, String message) {
  if (!ok) throw StateError(message);
}

void shouldReject(void Function() operation, String field) {
  try {
    operation();
  } on FormatException {
    return;
  }
  throw StateError('Expected rejection for $field');
}

void main() {
  final groups = loadCommunities();
  final fixture = {
    '@type': 'Event',
    'name': 'Flutter Singapore Q4 Meetup',
    'description': 'A Flutter community meetup.',
    'url': 'https://www.meetup.com/flutter-singapore/events/317267795/',
    'startDate': '2026-12-15T18:30:00+08:00',
    'endDate': '2026-12-15T20:30:00+08:00',
    'dateModified': '2026-11-28T00:00:00Z',
    'eventStatus': 'https://schema.org/EventRescheduled',
    'location': [
      {'@type': 'VirtualLocation'},
      {
        '@type': 'Place',
        'name': 'National Library',
        'address': {
          'addressLocality': 'Singapore',
          'addressCountry': {'name': 'Singapore'},
        },
        'geo': {'latitude': '1.2976', 'longitude': 103.8543},
      },
    ],
    'offers': {
      'url': 'https://www.meetup.com/flutter-singapore/events/317267795/',
      'validThrough': '2026-12-14T23:59:00+08:00',
    },
  };
  final exported = {
    '@graph': [
      {'@type': 'Organization'},
      fixture,
    ],
  };
  final fields = importFields(exported, 'flutter-singapore', 'Meetup', 'Asia/Singapore', null);
  validateContribution(fields, groups);
  check(fields['latitude'] == 1.2976 && fields['attendance'] == 'Hybrid', 'Hybrid place and coordinates');
  check(fields['status'] == 'rescheduled', 'Rescheduled status');
  final folder = Directory.systemTemp.createTempSync('flutter-spot-import-');
  try {
    final path = '${folder.path}/singapore.toml';
    final toml = TomlDocument.fromMap(fields).toString();
    File(path).writeAsStringSync(toml);
    final event = loadEvents(directory: folder.path, communities: groups).single;
    check(event.community == 'Flutter Singapore', 'Community foreign key');
    final deadline = event.registrationEnds!;
    check(
      event.registrationIsOpen(deadline.subtract(const Duration(seconds: 1))) && !event.registrationIsOpen(deadline),
      'Registration expiration',
    );
    File('${folder.path}/also-singapore.toml').writeAsStringSync(toml);
    shouldReject(() => loadEvents(directory: folder.path, communities: groups), 'duplicate source');
  } finally {
    folder.deleteSync(recursive: true);
  }
  final online = importFields(
    {
      ...fixture,
      'location': {'@type': 'VirtualLocation'},
      'eventStatus': 'EventCancelled',
    },
    'flutter-singapore',
    'Meetup',
    'Asia/Singapore',
    null,
  );
  validateContribution(online, groups);
  check(
    online['status'] == 'cancelled' &&
        !online.containsKey('registration_url') &&
        !online.containsKey('latitude') &&
        !online.containsKey('city'),
    'Cancelled virtual event',
  );
  shouldReject(() => validateContribution({...online, 'community_id': 'no-such-group'}, groups), 'unknown community');
  shouldReject(() => validateContribution({...online, 'latitude': 1, 'longitude': 2}, groups), 'virtual coordinates');
  shouldReject(() => validateContribution({...fields, 'latitude': 91}, groups), 'coordinate bounds');
  shouldReject(() => validateContribution({...fields, 'start': '2026-02-30'}, groups), 'invalid time');
  shouldReject(
    () => importFields([fixture, fixture], 'flutter-singapore', 'Meetup', 'Asia/Singapore', null),
    'ambiguous graph',
  );
  stdout.writeln('Passed import, normalized catalog and registration fixtures.');
}
