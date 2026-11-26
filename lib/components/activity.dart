import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:timezone/timezone.dart' as tz;
import '../event.dart';

class EventActivity extends StatelessComponent {
  const EventActivity(this.events, {super.key});
  final List<Event> events;

  String _day(DateTime instant, String zone) =>
      tz.TZDateTime.from(instant, tz.getLocation(zone)).toIso8601String().substring(0, 10);

  @override
  Component build(BuildContext context) => section(
    id: 'activity',
    classes: 'activity',
    attributes: {'aria-label': 'Event calendar for the past 12 months'},
    [
      div(id: 'activity-scroll', classes: 'activity-scroll', [
        div(id: 'activity-grid', classes: 'activity-grid', attributes: {'aria-label': 'Daily event counts'}, []),
      ]),
      div(
        id: 'activity-preview',
        classes: 'activity-preview',
        attributes: {
          'hidden': '',
          'role': 'dialog',
          'aria-label': 'Events on this day',
        },
        [],
      ),
      div(classes: 'activity-foot', [
        div(
          classes: 'activity-key',
          attributes: {'aria-label': 'Number of events per day, from zero to four or more'},
          [
            .text('Fewer'),
            for (int level = 0; level < 5; level++) span(classes: 'activity-cell level-$level', []),
            .text('More'),
          ],
        ),
      ]),
      div(
        attributes: {'hidden': ''},
        [
          for (final event in events)
            a(
              href: 'events/${event.slug}',
              attributes: {
                'data-first-day': _day(event.startsAt, event.timezone),
                'data-last-day': _day(event.endsAtExclusive.subtract(const Duration(microseconds: 1)), event.timezone),
                'data-start-instant': event.startsAt.toIso8601String(),
                'data-host': event.community,
                'data-place': event.city,
              },
              [.text(event.title)],
            ),
        ],
      ),
      script(src: 'activity.js', defer: true),
    ],
  );
}
