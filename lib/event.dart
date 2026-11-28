import 'dart:convert';

import 'package:timezone/data/latest_all.dart' as zone_data;
import 'package:timezone/timezone.dart' as tz;

import 'catalog_toml.dart';
import 'community.dart';
import 'project.dart';

export 'community.dart';

const eventCategories = {'Conference', 'Meetup', 'Workshop', 'Hackathon', 'Gathering'};
const attendanceFormats = {'In person', 'Online', 'Hybrid'};
const eventStatuses = {'scheduled', 'cancelled', 'rescheduled'};

final _timestamp = RegExp(
  r'^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d{1,6})?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$',
);

/// A validated entry from the community-maintained event directory.
class Event {
  final String id, title, city, country, communityId, community, category, attendance;
  final String start, end, timezone, venue, description, url, source, status, topic;
  final String? artwork,
      artworkCard,
      artworkThumbnail,
      artworkCredit,
      artworkSource,
      registrationUrl,
      registrationLabel,
      price;
  final double? latitude, longitude;
  final DateTime startsAt, endsAtExclusive, updatedAt;
  final DateTime? registrationEnds;
  final bool legacy;

  const Event._({
    required this.id,
    required this.title,
    required this.city,
    required this.country,
    required this.communityId,
    required this.community,
    required this.category,
    required this.attendance,
    required this.start,
    required this.end,
    required this.timezone,
    required this.venue,
    required this.description,
    required this.url,
    required this.source,
    required this.status,
    required this.artwork,
    required this.artworkCard,
    required this.artworkThumbnail,
    required this.artworkCredit,
    required this.artworkSource,
    required this.registrationUrl,
    required this.registrationLabel,
    required this.price,
    required this.latitude,
    required this.longitude,
    required this.startsAt,
    required this.endsAtExclusive,
    required this.updatedAt,
    required this.registrationEnds,
    required this.topic,
    required this.legacy,
  });

  String get slug => id;
  String get format => category;
  bool get allDay => start.length == 10;
  bool registrationIsOpen(DateTime at) =>
      status != 'cancelled' &&
      endsAtExclusive.isAfter(at) &&
      (registrationEnds == null || registrationEnds!.isAfter(at));
  String? get activeRegistrationUrl => registrationIsOpen(DateTime.now()) ? registrationUrl : null;

  /// RFC 5545 calendar event. Date-only entries keep the host's calendar dates.
  String get ics {
    final startField = allDay ? 'DTSTART;VALUE=DATE:${start.replaceAll('-', '')}' : 'DTSTART:${_utcStamp(startsAt)}';
    final followingDay = DateTime.parse('${end.substring(0, 10)}T00:00:00Z').add(const Duration(days: 1));
    final endField = allDay
        ? 'DTEND;VALUE=DATE:${_utcStamp(followingDay).substring(0, 8)}'
        : 'DTEND:${_utcStamp(endsAtExclusive)}';
    final lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//$projectName//Community events//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:$slug@$projectName',
      'DTSTAMP:${_utcStamp(updatedAt)}',
      if (status == 'cancelled') 'STATUS:CANCELLED',
      startField,
      endField,
      'SUMMARY:${_calendarText(title)}',
      'DESCRIPTION:${_calendarText(description)}',
      'LOCATION:${_calendarText({venue, city, country}.where((part) => part.isNotEmpty).join(', '))}',
      'URL:$url',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return '${lines.map(_foldLine).join('\r\n')}\r\n';
  }
}

String _utcStamp(DateTime time) => '${time.toUtc().toIso8601String().split('.').first.replaceAll(RegExp('[-:]'), '')}Z';

String _calendarText(String text) => text
    .replaceAll('\\', '\\\\')
    .replaceAll(RegExp(r'\r\n|\r|\n'), r'\n')
    .replaceAll(';', r'\;')
    .replaceAll(',', r'\,');

// A physical iCalendar line is at most 75 octets, including the continuation space.
String _foldLine(String line) {
  final result = StringBuffer();
  var width = 0;
  for (final rune in line.runes) {
    final character = String.fromCharCode(rune);
    final bytes = utf8.encode(character).length;
    if (width + bytes > 75) {
      result.write('\r\n ');
      width = 1;
    }
    result.write(character);
    width += bytes;
  }
  return result.toString();
}

DateTime _parseDate(String input, String key, tz.Location location, {bool endOfDay = false}) {
  final match = _timestamp.firstMatch(input);
  if (match == null) throw FormatException('$key must be YYYY-MM-DD or an ISO timestamp with an explicit offset');
  final year = int.parse(match[1]!);
  final month = int.parse(match[2]!);
  final day = int.parse(match[3]!);
  final date = DateTime.utc(year, month, day);
  if (date.year != year || date.month != month || date.day != day) {
    throw FormatException('$key contains an invalid calendar date');
  }
  if (match[4] != null) return DateTime.parse(input).toUtc();
  return tz.TZDateTime(location, year, month, day + (endOfDay ? 1 : 0)).native.toUtc();
}

String _urlKey(String value) {
  final uri = Uri.parse(value);
  final path = uri.path.replaceFirst(RegExp(r'/+$'), '');
  return uri.removeFragment().replace(path: path).toString();
}

DateTime _instant(Fields data, String key) {
  final value = fieldText(data, key)!;
  if (value.length <= 10) throw FormatException('$key must include a time and UTC offset');
  return _parseDate(value, key, tz.UTC);
}

String _choice(Fields data, String key, Set<String> choices) {
  final value = fieldText(data, key)!;
  if (!choices.contains(value)) throw FormatException('$key must be one of ${choices.join(', ')}');
  return value;
}

Event _readEvent(String id, Fields data, Map<String, Community>? communities) {
  final legacy = communities == null;
  const shared = {'title', 'start', 'end', 'timezone', 'description', 'url'};
  const tickets = {'registration_url', 'registration_label', 'price'};
  if (legacy) {
    checkKeys(data, {...shared, 'topic', 'format', 'venue', 'city', 'country', 'community'}, tickets);
  } else {
    checkKeys(
      data,
      {...shared, 'category', 'attendance', 'community_id', 'updated_at'},
      {
        ...tickets,
        'city',
        'country',
        'venue',
        'latitude',
        'longitude',
        'source',
        'status',
        'artwork',
        'artwork_thumbnail',
        'artwork_card',
        'artwork_credit',
        'artwork_source',
        'registration_ends',
      },
    );
  }
  final communityId = fieldText(data, 'community_id') ?? '';
  final organizer = communities?[communityId];
  if (!legacy && organizer == null) throw FormatException('Unknown community "$communityId"');
  final category = legacy ? fieldText(data, 'format')! : _choice(data, 'category', eventCategories);
  final attendance = legacy
      ? (data['city'] == 'Online' ? 'Online' : 'In person')
      : _choice(data, 'attendance', attendanceFormats);
  final city = fieldText(data, 'city') ?? '';
  final country = fieldText(data, 'country') ?? '';
  final (lat, lon) = coordinates(data);
  if (!legacy && attendance != 'Online' && (city.isEmpty || country.isEmpty)) {
    throw const FormatException('An in-person or hybrid event needs a city and country');
  }
  if (attendance == 'Online' && lat != null) {
    throw const FormatException('Online events must omit physical coordinates');
  }
  final status = data.containsKey('status') ? _choice(data, 'status', eventStatuses) : 'scheduled';
  final registration = fieldLink(data, 'registration_url');
  if ((data.containsKey('registration_label') || data.containsKey('registration_ends')) && registration == null) {
    throw const FormatException('Registration details need a registration_url');
  }
  final timezone = fieldText(data, 'timezone')!;
  final zone = tz.timeZoneDatabase.locations[timezone];
  if (zone == null) throw FormatException('Unknown IANA timezone "$timezone"');
  final start = fieldText(data, 'start')!;
  final end = fieldText(data, 'end')!;
  if ((start.length == 10) != (end.length == 10)) {
    throw const FormatException('Use either calendar dates for both start and end or timestamps for both');
  }
  final startsAt = _parseDate(start, 'start', zone);
  final endsAt = _parseDate(end, 'end', zone, endOfDay: true);
  if (!endsAt.isAfter(startsAt)) throw const FormatException('Event must end after it starts');
  final registrationEnds = data.containsKey('registration_ends') ? _instant(data, 'registration_ends') : null;
  final url = fieldLink(data, 'url')!;
  final artwork = imagePath(data, 'artwork');
  final thumbnail = imagePath(data, 'artwork_thumbnail');
  final card = imagePath(data, 'artwork_card');
  final credit = fieldText(data, 'artwork_credit');
  final artSource = fieldLink(data, 'artwork_source');
  if ((card != null || thumbnail != null || credit != null || artSource != null) && artwork == null) {
    throw const FormatException('Artwork credits need an artwork path');
  }
  return Event._(
    id: id,
    title: fieldText(data, 'title')!,
    city: city,
    country: country,
    communityId: communityId,
    community: organizer?.name ?? fieldText(data, 'community')!,
    category: category,
    attendance: attendance,
    start: start,
    end: end,
    timezone: timezone,
    venue: fieldText(data, 'venue') ?? '',
    description: fieldText(data, 'description')!,
    url: url,
    source: fieldLink(data, 'source') ?? url,
    status: status,
    artwork: artwork,
    artworkThumbnail: thumbnail ?? artwork,
    artworkCard: card,
    artworkCredit: credit,
    artworkSource: artSource,
    registrationUrl: registration,
    registrationLabel: fieldText(data, 'registration_label'),
    price: fieldText(data, 'price'),
    latitude: lat,
    longitude: lon,
    startsAt: startsAt,
    endsAtExclusive: endsAt,
    updatedAt: legacy ? startsAt : _instant(data, 'updated_at'),
    registrationEnds: registrationEnds,
    topic: fieldText(data, 'topic') ?? 'Flutter',
    legacy: legacy,
  );
}

List<Event> _load(String directory, Map<String, Community>? communities) {
  zone_data.initializeTimeZones();
  final result = readDirectory(directory, (id, fields) => _readEvent(id, fields, communities));
  final identities = <String, String>{};
  for (final event in result) {
    // Series may reuse a venue and website for their next edition. Scope identities to the host day.
    final day = tz.TZDateTime.from(event.startsAt, tz.getLocation(event.timezone)).toString().substring(0, 10);
    final keys = {
      'title:${event.title.toLowerCase().replaceAll(RegExp(r'\s+'), ' ')}|${event.city.toLowerCase()}',
      'url:${_urlKey(event.url)}',
      if (event.registrationUrl != null) 'url:${_urlKey(event.registrationUrl!)}',
    };
    for (final key in keys) {
      final previous = identities['$day|$key'];
      if (previous != null) throw FormatException('Duplicate event in $previous.toml and ${event.id}.toml');
      identities['$day|$key'] = event.id;
    }
  }
  return result..sort((a, b) {
    final byStart = a.startsAt.compareTo(b.startsAt);
    return byStart == 0 ? a.id.compareTo(b.id) : byStart;
  });
}

List<Event> loadEvents({String directory = 'events', List<Community>? communities}) {
  final organizers = communities ?? loadCommunities();
  return _load(directory, {for (final group in organizers) group.id: group});
}

/// Old public event URLs still render individually after the Flutter-only catalog migration.
List<Event> loadLegacyEvents({String directory = 'legacy-events'}) => _load(directory, null);

/// Run the same record checks on an integration export before emitting its TOML.
void validateContribution(Map<String, dynamic> fields, List<Community> communities) {
  zone_data.initializeTimeZones();
  _readEvent('contribution', fields, {for (final group in communities) group.id: group});
}
