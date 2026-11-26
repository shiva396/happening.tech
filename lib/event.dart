import 'dart:convert';
import 'dart:io';

import 'package:timezone/data/latest_all.dart' as zone_data;
import 'package:timezone/timezone.dart' as tz;
import 'package:toml/toml.dart';

const _requiredKeys = {
  'title',
  'city',
  'country',
  'community',
  'topic',
  'format',
  'start',
  'end',
  'timezone',
  'venue',
  'description',
  'url',
};
const _optionalKeys = {'registration_url', 'registration_label', 'price'};
final _slugPattern = RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$');
final _timestamp = RegExp(
  r'^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d{1,6})?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$',
);

/// A validated entry from the community-maintained event directory.
class Event {
  final String slug;
  final Map<String, String> _data;
  final DateTime startsAt;
  final DateTime endsAtExclusive;

  Event._(this.slug, this._data, this.startsAt, this.endsAtExclusive);

  String get title => _data['title']!;
  String get city => _data['city']!;
  String get country => _data['country']!;
  String get community => _data['community']!;
  String get topic => _data['topic']!;
  String get format => _data['format']!;
  String get start => _data['start']!;
  String get end => _data['end']!;
  String get timezone => _data['timezone']!;
  String get venue => _data['venue']!;
  String get description => _data['description']!;
  String get url => _data['url']!;
  String? get registrationUrl => _data['registration_url'];
  String? get registrationLabel => _data['registration_label'];
  String? get price => _data['price'];
  bool get allDay => start.length == 10;

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
      'PRODID:-//happening.tech//Community events//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:$slug@happening.tech',
      'DTSTAMP:${_utcStamp(DateTime.now())}',
      startField,
      endField,
      'SUMMARY:${_calendarText(title)}',
      'DESCRIPTION:${_calendarText(description)}',
      'LOCATION:${_calendarText({venue, city, country}.join(', '))}',
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

Event _readEvent(File file, String slug) {
  if (!_slugPattern.hasMatch(slug)) throw const FormatException('Use a lowercase, hyphen-separated filename');
  final raw = TomlDocument.parse(file.readAsStringSync()).toMap();
  final data = <String, String>{};
  for (final key in raw.keys) {
    if (!_requiredKeys.contains(key) && !_optionalKeys.contains(key)) throw FormatException('Unknown field "$key"');
    final value = raw[key];
    if (value is! String || value.trim().isEmpty) throw FormatException('"$key" must be a nonempty quoted string');
    data[key] = value.trim();
  }
  final missing = _requiredKeys.difference(data.keys.toSet());
  if (missing.isNotEmpty) throw FormatException('Missing ${missing.join(', ')}');
  for (final key in ['url', 'registration_url']) {
    final value = data[key];
    if (value == null) continue;
    final uri = Uri.tryParse(value);
    if (uri == null ||
        !['https', 'http'].contains(uri.scheme) ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        RegExp(r'[\s\\]').hasMatch(value)) {
      throw FormatException('"$key" must be an absolute HTTP(S) link');
    }
  }
  if (data.containsKey('registration_label') && !data.containsKey('registration_url')) {
    throw const FormatException('registration_label needs a registration_url');
  }
  final location = tz.timeZoneDatabase.locations[data['timezone']];
  if (location == null) throw FormatException('Unknown IANA timezone "${data['timezone']}"');
  if ((data['start']!.length == 10) != (data['end']!.length == 10)) {
    throw const FormatException('Use either calendar dates for both start and end or timestamps for both');
  }
  final startsAt = _parseDate(data['start']!, 'start', location);
  final endsAt = _parseDate(data['end']!, 'end', location, endOfDay: true);
  if (!endsAt.isAfter(startsAt)) {
    throw const FormatException('Event must end after it starts (date-only ends are inclusive)');
  }
  return Event._(slug, data, startsAt, endsAt);
}

/// Reads all event pages, including past entries with permanent URLs.
List<Event> loadEvents({String directory = 'events'}) {
  zone_data.initializeTimeZones();
  final result = <Event>[];
  final seenSlugs = <String>{};
  final seenUrls = <String, String>{};
  final files = Directory(
    directory,
  ).listSync(followLinks: false).whereType<File>().where((f) => f.path.endsWith('.toml'));
  for (final file in files) {
    final name = file.uri.pathSegments.last;
    final slug = name.substring(0, name.length - '.toml'.length);
    try {
      final event = _readEvent(file, slug);
      if (!seenSlugs.add(slug)) throw FormatException('Duplicate slug "$slug"');
      for (final url in {event.url, ?event.registrationUrl}.map(_urlKey).toSet()) {
        final previous = seenUrls[url];
        if (previous != null) throw FormatException('Event URL already appears in $previous.toml');
        seenUrls[url] = slug;
      }
      result.add(event);
    } on Exception catch (error) {
      throw FormatException('${file.path}: $error');
    }
  }
  return result..sort((a, b) {
    final order = a.startsAt.compareTo(b.startsAt);
    return order == 0 ? a.slug.compareTo(b.slug) : order;
  });
}
