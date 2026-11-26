import 'dart:convert';

import 'package:jaspr/dom.dart';
import 'package:jaspr/server.dart';
import 'package:timezone/timezone.dart' as tz;
import '../event.dart';
import '../components/activity.dart';
import '../components/country_globe.dart';
import '../components/icon.dart';
import '../components/poster_art.dart';
import '../components/motion.dart';

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
DateTime _hostDate(Event event, {bool end = false}) {
  final raw = end ? event.end : event.start;
  if (event.allDay) return DateTime.parse(raw);
  return tz.TZDateTime.from(DateTime.parse(raw), tz.getLocation(event.timezone));
}

String _date(DateTime d) {
  return '${d.day} ${months[d.month - 1].substring(0, 3)} ${d.year}';
}

String _place(Event e) => e.city.toLowerCase() == 'online' ? 'Online' : '${e.city}, ${e.country}';
String _tone(Event e) => switch (e.topic.toLowerCase()) {
  'flutter' => 'iris',
  'python' => 'ember',
  'open source' => 'moss',
  _ => ['iris', 'moss', 'ember'][e.community.codeUnits.fold(0, (int sum, unit) => sum + unit) % 3],
};
String _month(Event e) => '${months[_hostDate(e).month - 1]} ${_hostDate(e).year}';

class Programme extends StatelessComponent {
  final List<Event> events;
  final bool world;
  final bool past;
  const Programme(this.events, {this.world = false, this.past = false, super.key});

  @override
  Component build(BuildContext context) {
    final now = DateTime.now();
    final ordered = past ? events.reversed.toList() : events;
    final visible = ordered.where((e) => e.endsAtExclusive.isAfter(now) != past).toList();
    final initial = world ? visible.where((e) => e.country == 'India').toList() : visible;
    // Include future entries in the static archive so the browser can reveal them as they end.
    final entries = past ? ordered : visible;
    final cities = entries.map((e) => e.city).toSet().toList()..sort();
    final topics = entries.map((e) => e.topic).toSet().toList()..sort();
    final listTitle = past ? 'Past events' : 'Upcoming events';
    final filters = div(
      classes: 'filters',
      attributes: {'data-interactive': ''},
      [
        label(classes: 'search', [
          icon('search'),
          Component.element(
            tag: 'input',
            attributes: {
              'type': 'search',
              'placeholder': 'Search events',
              'aria-label': 'Search events or communities',
              'id': 'query',
            },
          ),
        ]),
        facet('city', 'All locations', 'map-pin', cities),
        facet('topic', 'All topics', 'layers', topics),
        span(classes: 'zone', [
          icon('clock-3'),
          span([.text('Dates in the host’s time zone')]),
        ]),
      ],
    );
    final listing = section(
      classes: 'event-list',
      attributes: {'aria-label': listTitle},
      [
        div(classes: 'section-head', [
          h2([.text(listTitle)]),
          span(
            id: 'count',
            attributes: {'aria-live': 'polite'},
            [.text('${initial.length} ${initial.length == 1 ? 'event' : 'events'}')],
          ),
          a(classes: 'archive-link', href: past ? './' : 'past/', [
            .text(past ? 'See upcoming events' : 'See past events'),
          ]),
        ]),
        for (final group in entries.map(_month).toSet())
          div(
            classes: 'month-group',
            attributes: {if (!initial.any((e) => _month(e) == group)) 'hidden': ''},
            [
              h3(classes: 'month', [.text(group)]),
              for (final e in entries.where((e) => _month(e) == group))
                eventRow(e, e == initial.firstOrNull, hidden: !initial.contains(e)),
            ],
          ),
        div(
          id: 'empty',
          attributes: {if (initial.isNotEmpty || world) 'hidden': ''},
          [
            h3([.text('No events to show')]),
            p([.text('Try another city or topic, or add a gathering from your community.')]),
            if (!world) button(id: 'reset', attributes: {'hidden': ''}, [.text('Clear filters')]),
            a(href: 'submit', [.text('List an event')]),
          ],
        ),
      ],
    );
    final spotlight = section(
      classes: 'spotlight',
      attributes: {'aria-label': 'Selected event'},
      [
        div(
          classes: 'section-head',
          attributes: {if (world) 'data-detail-heading': ''},
          [
            h2([.text(world ? 'Event details' : 'Event spotlight')]),
            if (world) span(id: 'country-paging', attributes: {'aria-live': 'polite'}, []),
            if (world)
              button(
                id: 'country-prev',
                attributes: {'aria-label': 'Previous event', 'hidden': ''},
                [icon('chevron-down')],
              ),
            if (world)
              button(
                id: 'country-next',
                attributes: {'aria-label': 'Next event', 'hidden': ''},
                [icon('chevron-right')],
              ),
            motionSlot('ticket', icon('ticket')),
          ],
        ),
        if (world)
          div(
            id: 'country-empty',
            attributes: {if (initial.isNotEmpty) 'hidden': ''},
            [
              div(
                classes: 'empty-art',
                attributes: {'data-motion': 'invitation', 'aria-hidden': 'true'},
                [
                  img(src: 'art/invitation.webp', alt: ''),
                ],
              ),
              div(classes: 'empty-copy', [
                h3([.text('No upcoming events here')]),
                p([.text('Know a gathering here? Share it with the community.')]),
                button(id: 'reset', attributes: {'hidden': ''}, [.text('Clear filters')]),
                a(classes: 'list-event', href: 'submit', [.text('List an event')]),
              ]),
            ],
          ),
        for (final e in entries)
          div(
            classes: 'selected-panel',
            attributes: {'data-panel': e.slug, if (e != initial.firstOrNull) 'hidden': ''},
            [EventTicket(e)],
          ),
      ],
    );
    return div(
      classes: 'wrap programme',
      attributes: {'data-directory': past ? 'past' : 'upcoming'},
      [
        header(classes: 'opening', [
          h1([
            .text(
              world
                  ? 'World view'
                  : past
                  ? 'Past events'
                  : 'The programme',
            ),
            span([.text('.')]),
          ]),
        ]),
        if (world)
          div(classes: 'world-layout', [
            CountryGlobe(visible.map((e) => e.city.toLowerCase() == 'online' ? 'Online' : e.country).toSet()),
            div(classes: 'country-programme', [
              h2(id: 'country-title', [.text('Events in India')]),
              div(classes: 'country-list', [filters, listing]),
              spotlight,
            ]),
          ])
        else ...[
          filters,
          if (!world && !past && visible.isNotEmpty)
            a(
              href: 'events/${visible.first.slug}',
              classes: 'mobile-feature',
              attributes: {'data-feature': visible.first.slug, 'aria-label': 'View ${visible.first.title}'},
              [
                eventPoster(visible.first),
              ],
            ),
          div(classes: 'spread', [listing, spotlight]),
        ],
        if (!world) EventActivity(events),
      ],
    );
  }
}

Component facet(String id, String all, String symbol, List<String> values) => label(classes: 'facet', [
  icon(symbol),
  select(
    id: id,
    attributes: {'aria-label': all},
    [
      option(value: '', [.text(all)]),
      for (final v in values) option(value: v, [.text(v)]),
    ],
  ),
  icon('chevron-down'),
]);

Component eventRow(Event e, bool first, {bool hidden = false}) {
  final day = _hostDate(e);
  return a(
    href: 'events/${e.slug}',
    classes: 'event-row',
    attributes: {
      if (hidden) 'hidden': '',
      'data-slug': e.slug,
      'data-city': e.city,
      'data-country': e.city.toLowerCase() == 'online' ? 'Online' : e.country,
      'data-topic': e.topic,
      'data-host': e.community,
      'data-date': _date(_hostDate(e)),
      'data-expires': e.endsAtExclusive.toIso8601String(),
      if (first) 'data-selected': 'true',
    },
    [
      div(classes: 'date-block', [
        span([.text(weekdays[day.weekday - 1])]),
        strong([.text(day.day.toString().padLeft(2, '0'))]),
      ]),
      div(classes: 'row-info', [
        div(classes: 'row-byline', [
          span(classes: 'topic ${_tone(e)}', [.text(e.topic)]),
          span([.text(e.community)]),
        ]),
        h4([.text(e.title)]),
        div(classes: 'row-meta', [
          icon('map-pin'),
          .text(_place(e)),
          span(classes: 'dot', [.text('·')]),
          .text(e.format),
        ]),
      ]),
      icon('chevron-right'),
    ],
  );
}

Component eventPoster(Event e) {
  final tone = _tone(e);
  return div(classes: 'poster $tone', [
    posterArt(city: e.city),
    div(classes: 'poster-top', [
      span([.text(e.format)]),
      span([.text(_hostDate(e).year.toString())]),
    ]),
    div(classes: 'poster-title', [.text(e.title)]),
    div(classes: 'poster-foot', [
      span([.text(e.city)]),
      span([.text(_date(_hostDate(e)))]),
    ]),
  ]);
}

class EventTicket extends StatelessComponent {
  final Event event;
  final bool standalone;
  const EventTicket(this.event, {this.standalone = false, super.key});
  @override
  Component build(BuildContext context) {
    final e = event;
    final start = _hostDate(e);
    final sameDay = _date(start) == _date(_hostDate(e, end: true));
    final dates = sameDay ? _date(_hostDate(e)) : '${_date(_hostDate(e))} to ${_date(_hostDate(e, end: true))}';
    final elapsed = !e.endsAtExclusive.isAfter(DateTime.now());
    return article(
      classes: 'ticket-card',
      attributes: {'data-end': e.endsAtExclusive.toIso8601String()},
      [
        eventPoster(e),
        div(classes: 'ticket-info', [
          div(classes: 'host-line', [.text('Hosted by ${e.community}')]),
          if (standalone)
            h1([.text(e.title)])
          else
            h3([
              a(href: 'events/${e.slug}', [.text(e.title)]),
            ]),
          div(classes: 'ticket-actions', [
            a(
              href: elapsed ? e.url : (e.registrationUrl ?? e.url),
              classes: 'primary-action',
              attributes: {'data-host-url': e.url},
              [
                span([
                  .text(elapsed ? 'Visit event archive' : (e.registrationLabel ?? 'Visit organizer site')),
                ]),
                icon('arrow-up-right'),
              ],
            ),
            a(
              href: Uri.dataFromString(e.ics, mimeType: 'text/calendar', encoding: utf8).toString(),
              download: '${e.slug}.ics',
              classes: 'calendar-action',
              attributes: {'aria-label': 'Add ${e.title} to calendar', 'title': 'Add to calendar'},
              [motionSlot('check', icon('calendar-plus'))],
            ),
          ]),
          p(classes: 'summary', [.text(e.description)]),
          div(classes: 'facts', [
            div([
              icon('calendar-days'),
              div([
                strong([.text(dates)]),
                if (!e.allDay)
                  span(
                    attributes: {'data-local-start': e.start, 'data-local-end': e.end},
                    [.text('${start.toIso8601String().substring(11, 16)} · ${e.timezone}')],
                  ),
              ]),
            ]),
            div([
              icon('map-pin'),
              div([
                strong([.text(e.venue)]),
                if (e.city != e.venue) span([.text(_place(e))]),
              ]),
            ]),
            if (e.price != null)
              div([
                icon('ticket'),
                strong([.text(e.price!)]),
              ]),
          ]),
          if (!standalone)
            a(classes: 'permalink', href: 'events/${e.slug}', [.text('Full event details'), icon('chevron-right')])
          else if (e.registrationUrl != null && e.registrationUrl != e.url)
            a(classes: 'permalink', href: e.url, [.text('Organizer’s event page'), icon('arrow-up-right')]),
        ]),
      ],
    );
  }
}

class EventPage extends StatelessComponent {
  final Event event;
  const EventPage(this.event, {super.key});
  @override
  Component build(BuildContext context) => div(classes: 'wrap detail', [
    Document.head(meta: {'description': event.description}),
    a(href: './', classes: 'back', [.text('←  The programme')]),
    EventTicket(event, standalone: true),
  ]);
}
