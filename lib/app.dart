import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';
import 'event.dart';
import 'pages/home.dart';
import 'pages/submit.dart';

class App extends StatelessComponent {
  final List<Event> events;
  const App(this.events, {super.key});

  @override
  Component build(BuildContext context) {
    final path = Uri.parse(context.url).path;
    return div([
      a(href: '$path#content', classes: 'skip', [.text('Skip to content')]),
      header(classes: 'masthead', [
        div(classes: 'wrap mast-inner', [
          a(href: '/', classes: 'brand', [
            .text('happening'),
            span([.text('.tech')]),
          ]),
          nav(
            attributes: {'aria-label': 'Main navigation'},
            [
              for (final entry in [('/', 'Programme', 'list'), ('/world', 'World view', 'globe')])
                a(
                  href: entry.$1,
                  classes: 'nav-item',
                  attributes: {
                    if (entry.$1 == '/'
                        ? path == '/' || path.startsWith('/past') || path.startsWith('/events/')
                        : path.startsWith('/world'))
                      'aria-current': 'page',
                  },
                  [icon(entry.$3), .text(entry.$2)],
                ),
            ],
          ),
          a(href: '/submit', classes: 'list-event', [icon('plus'), .text('List an event')]),
        ]),
      ]),
      main_(id: 'content', [
        Router(
          routes: [
            Route(path: '/', title: 'The programme · happening.tech', builder: (_, _) => Programme(events)),
            Route(
              path: '/world',
              title: 'World view · happening.tech',
              builder: (_, _) => Programme(events, world: true),
            ),
            Route(
              path: '/past',
              title: 'Past events · happening.tech',
              builder: (_, _) => Programme(events, past: true),
            ),
            Route(path: '/submit', title: 'List an event · happening.tech', builder: (_, _) => const SubmitPage()),
            for (final event in events)
              Route(
                path: '/events/${event.slug}',
                title: '${event.title} · happening.tech',
                builder: (_, _) => EventPage(event),
              ),
          ],
        ),
      ]),
      footer(classes: 'site-foot wrap', [
        a(href: '/', classes: 'footer-brand', [.text('happening.tech')]),
        a(href: '/submit', [.text('Contribute an event')]),
      ]),
    ]);
  }
}
