import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/icon.dart';
import '../event.dart';
import 'presentation.dart';

Component eventCard(Event e, {bool hidden = false}) => article(
  classes: 'event-card',
  attributes: {'data-event': e.id, if (hidden) 'hidden': ''},
  [
    a(
      classes: 'event-photo',
      href: 'events/${e.slug}/',
      attributes: {'aria-label': e.title},
      [
        img(src: e.artworkCard ?? eventImage(e), alt: '', loading: MediaLoading.lazy, width: 560, height: 310),
        span(classes: 'photo-label', [.text(e.category)]),
      ],
    ),
    div(classes: 'card-copy', [
      div(classes: 'card-date', [
        .text(displayDate(e)),
        if (e.status != 'scheduled') span([.text(e.status)]),
      ]),
      h3([
        a(href: 'events/${e.slug}/', [.text(e.title)]),
      ]),
      p(classes: 'card-place', [icon(e.attendance == 'Online' ? 'globe' : 'map-pin'), .text(eventPlace(e))]),
      div(classes: 'card-end', [
        a(href: 'communities/${e.communityId}/', [.text(e.community)]),
        span([.text(e.attendance)]),
      ]),
      if (e.latitude != null)
        a(
          classes: 'map-action',
          href: './?event=${e.id}#world',
          attributes: {'data-on-map': e.id, 'aria-label': 'Show ${e.title} on the globe', 'title': 'Show on globe'},
          [icon('globe')],
        ),
    ]),
  ],
);

class ProgramView extends StatelessComponent {
  const ProgramView(this.events, {this.archive = false, super.key});
  final List<Event> events;
  final bool archive;

  @override
  Component build(BuildContext context) {
    final now = DateTime.now();
    final ordered = [
      ...events.where((e) => !pastEvent(e, now)),
      ...events.where((e) => pastEvent(e, now)).toList().reversed,
    ];
    final active = ordered.where((e) => pastEvent(e, now) == archive);
    return section(
      id: 'program',
      classes: 'section program',
      attributes: {'data-archive': '$archive', 'aria-labelledby': 'program-title'},
      [
        div(classes: 'section-inner', [
          div(classes: 'split-heading', [
            if (archive)
              h1(id: 'program-title', [.text('Past events')])
            else
              h2(id: 'program-title', [.text('Event program')]),
            if (archive)
              a(
                classes: 'pill',
                href: './?period=past#world',
                attributes: {'data-view': 'world'},
                [
                  icon('globe'),
                  .text('World view'),
                ],
              ),
          ]),
          div(classes: 'filter-bar enhanced', [
            label(classes: 'search-field', [
              icon('search'),
              input(
                type: InputType.search,
                attributes: {'data-filter': 'q', 'aria-label': 'Search events', 'placeholder': 'Search events…'},
              ),
            ]),
            fieldSelect('country', 'All countries', events.map((e) => e.country)),
            fieldSelect('category', 'Event type', events.map((e) => e.category)),
            details(classes: 'extra-filters', [
              summary([icon('list-filter'), .text('More filters')]),
              div(classes: 'filter-popover', [
                fieldSelect('city', 'Any city', events.map((e) => e.city), caption: 'City'),
                fieldSelect('attendance', 'Any format', events.map((e) => e.attendance), caption: 'Attendance'),
                for (final (key, name) in [('from', 'From'), ('until', 'Through')])
                  label([
                    span(classes: 'field-label', [.text(name)]),
                    input(type: InputType.date, attributes: {'data-filter': key, 'aria-label': name}),
                  ]),
              ]),
            ]),
          ]),
          div(classes: 'program-tabs', [
            div(
              attributes: {'aria-label': 'Event period'},
              [
                for (final (key, label) in [('upcoming', 'Upcoming'), ('past', 'Past events')])
                  a(
                    href: key == 'past' ? 'archive/#program' : './#program',
                    classes: ((key == 'past') == archive) ? 'current' : '',
                    attributes: {'data-period': key},
                    [.text(label)],
                  ),
              ],
            ),
            span(id: 'program-count', attributes: {'aria-live': 'polite'}, [.text('${active.length} events')]),
          ]),
          div(classes: 'event-grid', [for (final e in ordered) eventCard(e, hidden: pastEvent(e, now) != archive)]),
          div(
            id: 'event-empty',
            classes: 'empty-state',
            attributes: {if (active.isNotEmpty) 'hidden': ''},
            [
              h3([.text('No events found')]),
              div(classes: 'inline-actions', [
                button(classes: 'pill enhanced', attributes: {'data-clear': ''}, [.text('Clear filters')]),
                a(classes: 'text-link', href: 'submit/', [.text('List an event')]),
              ]),
            ],
          ),
          button(
            id: 'clear-active',
            classes: 'text-link enhanced',
            attributes: {'data-clear': '', 'hidden': ''},
            [.text('Clear active filters')],
          ),
        ]),
      ],
    );
  }
}
