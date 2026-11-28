import 'dart:convert';

import 'package:jaspr/dom.dart';
import 'package:jaspr/server.dart';
import 'package:timezone/timezone.dart' as tz;

import '../components/icon.dart';
import '../event.dart';
import '../project.dart';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

DateTime hostDay(Event event, {bool last = false}) {
  final raw = last ? event.end : event.start;
  if (event.allDay) return DateTime.parse(raw);
  return tz.TZDateTime.from(DateTime.parse(raw), tz.getLocation(event.timezone));
}

String displayDate(Event event) {
  final start = hostDay(event);
  final end = hostDay(event, last: true);
  String short(DateTime d) => '${d.day} ${monthNames[d.month - 1]}';
  if (start.year == end.year && start.month == end.month) {
    return '${start.day}${start.day == end.day ? '' : '–${end.day}'} ${monthNames[start.month - 1]} ${end.year}';
  }
  return '${short(start)}${start.year == end.year ? '' : ' ${start.year}'} – ${short(end)} ${end.year}';
}

String eventPlace(Event e) => e.attendance == 'Online' ? 'Online' : locationName(e.city, e.country);
String locationName(String city, String country) => {city, country}.where((part) => part.isNotEmpty).join(', ');
bool pastEvent(Event e, DateTime now) => !e.endsAtExclusive.isAfter(now);
String eventImage(Event e) =>
    e.artwork ?? 'art/atlas-print-${e.slug.codeUnits.fold(0, (sum, unit) => sum + unit) % 3}.svg';

Component brand() => a(
  href: './',
  classes: 'brand',
  attributes: {'aria-label': '$projectName home'},
  [
    img(src: 'art/atlas-mark.svg', width: 36, height: 36, alt: ''),
    span([
      .text(projectWordmark),
      b([.text(projectSuffix)]),
    ]),
  ],
);

Component overline(String glyph, String text) => div(classes: 'overline', [icon(glyph), .text(text)]);
Component homeLink(String target, String label, String glyph) =>
    a(href: './#$target', classes: 'pill', attributes: {'data-view': target}, [icon(glyph), .text(label)]);

Component pageHead(
  String title,
  String path, {
  String description = projectDescription,
  String image = 'art/world-poster.webp',
  Map<String, Object?>? structured,
}) => Document.head(
  title: '$title · $projectName',
  meta: {'description': description},
  children: [
    link(rel: 'canonical', href: publicUrl(path)),
    for (final entry in {
      'og:title': '$title · $projectName',
      'og:description': description,
      'og:url': publicUrl(path),
      'og:image': publicUrl(image),
      'og:type': 'website',
      'og:site_name': projectName,
    }.entries)
      Component.element(tag: 'meta', attributes: {'property': entry.key, 'content': entry.value}),
    if (structured != null) script(attributes: {'type': 'application/ld+json'}, content: safeJson(structured)),
  ],
);

String safeJson(Object value) =>
    jsonEncode(value).replaceAll('<', r'\u003c').replaceAll('>', r'\u003e').replaceAll('&', r'\u0026');

Map<String, Object?> communityRecord(Community c) => {
  'id': c.id,
  'kind': 'community',
  'title': c.name,
  'city': c.city,
  'country': c.country,
  'latitude': c.latitude,
  'longitude': c.longitude,
  'description': c.description,
  'url': c.url,
  'artwork': c.logo,
};

Map<String, Object?> eventRecord(Event e) => {
  'id': e.id,
  'kind': 'event',
  'title': e.title,
  'city': e.city,
  'country': e.country,
  'latitude': e.latitude,
  'longitude': e.longitude,
  'artwork': eventImage(e),
  'thumbnail': e.artworkThumbnail,
  'artworkCredit': e.artworkCredit,
  'artworkSource': e.artworkSource,
  'start': e.startsAt.toUtc().toIso8601String(),
  'end': e.endsAtExclusive.toUtc().toIso8601String(),
  'firstDay': hostDay(e).toIso8601String().substring(0, 10),
  'lastDay': hostDay(e, last: true).toIso8601String().substring(0, 10),
  'date': displayDate(e),
  'location': eventPlace(e),
  'community': e.community,
  'communityId': e.communityId,
  'category': e.category,
  'attendance': e.attendance,
  'status': e.status,
  'url': e.url,
  'registration': e.registrationUrl,
  'registrationLabel': e.registrationLabel,
  'registrationEnds': e.registrationEnds?.toUtc().toIso8601String(),
  'updated': e.updatedAt.toUtc().toIso8601String(),
};

Component dataIsland(List<Event> events, List<Community> communities) => script(
  id: 'atlas-data',
  attributes: {'type': 'application/json'},
  content: safeJson({
    'events': events.map(eventRecord).toList(),
    'communities': communities.map(communityRecord).toList(),
  }),
);

Component calendarLink(Event e) => a(
  classes: 'pill',
  href: Uri.dataFromString(e.ics, mimeType: 'text/calendar', encoding: utf8).toString(),
  download: '${e.slug}.ics',
  [icon('calendar-plus'), .text('Add to calendar')],
);

Component fieldSelect(String name, String labelText, Iterable<String> values, {String? caption}) =>
    label(classes: 'select-field', [
      span(classes: caption == null ? 'sr-only' : 'field-label', [.text(caption ?? labelText)]),
      select(
        attributes: {'data-filter': name, 'aria-label': caption ?? labelText},
        [
          option(value: '', [.text(labelText)]),
          for (final value in values.where((v) => v.isNotEmpty).toSet().toList()..sort())
            option(value: value, [.text(value)]),
        ],
      ),
      icon('chevron-down'),
    ]);

Component communityIdentity(Community c) => span(classes: 'community-mark', [
  if (c.logo != null)
    img(src: c.logo!, alt: '', loading: MediaLoading.lazy)
  else
    .text(c.name.split(RegExp(r'\s+')).take(2).map((w) => w.substring(0, 1)).join().toUpperCase()),
]);
