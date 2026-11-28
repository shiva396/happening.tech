import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/icon.dart';
import '../event.dart';
import 'presentation.dart';

class Activity extends StatelessComponent {
  const Activity(this.events, {super.key});
  final List<Event> events;
  @override
  Component build(BuildContext context) {
    final now = DateTime.now().toUtc();
    final ordered = [...events]..sort((left, right) => right.startsAt.compareTo(left.startsAt));
    final started = ordered.where((e) => e.status != 'cancelled' && !e.startsAt.isAfter(now)).take(4);
    return section(classes: 'section activity', [
      div(classes: 'section-inner activity-layout', [
        div([
          overline('radio', 'Global activity'),
          h2([
            .text('From the '),
            em([.text('field.')]),
          ]),
          p(classes: 'section-lede', [.text('Recent gatherings from across the Flutter community.')]),
        ]),
        div(classes: 'timeline', [
          for (final e in started)
            a(href: 'events/${e.slug}/', [
              span(classes: 'timeline-dot', []),
              div([
                small([.text('${e.endsAtExclusive.isAfter(now) ? 'Happening now' : 'Completed'} · ${displayDate(e)}')]),
                h3([.text(e.title)]),
                span([.text(eventPlace(e))]),
              ]),
              icon('chevron-right'),
            ]),
          if (started.isEmpty) p([.text('Completed gatherings will appear here as the program unfolds.')]),
        ]),
      ]),
    ]);
  }
}
