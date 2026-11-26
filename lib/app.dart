import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';
import 'components/icon.dart';
import 'components/playful_navigation.dart';
import 'event.dart';
import 'pages/home.dart';
import 'pages/submit.dart';
import 'pages/notifications.dart';
import 'components/motion.dart';
import 'project.dart';

class App extends StatelessComponent {
  final List<Event> events;
  const App(this.events, {super.key});

  @override
  Component build(BuildContext context) {
    final path = Uri.parse(context.url).path;
    return div([
      a(href: '.$path#content', classes: 'skip', [.text('Skip to content')]),
      header(classes: 'masthead', [
        div(classes: 'wrap mast-inner', [
          a(href: './', classes: 'brand', [
            .text('happening'),
            span([.text('.tech')]),
          ]),
          PlayfulNavigation(path),
          div(classes: 'mast-actions', [
            button(
              id: 'theme-switch',
              attributes: {'type': 'button', 'aria-label': 'Switch theme'},
              [icon('moon'), icon('sun')],
            ),
            a(href: 'submit', classes: 'list-event', [.text('List an event')]),
          ]),
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
              path: '/archive',
              title: 'Event archive · happening.tech',
              builder: (_, _) => Programme(events, archive: true),
            ),
            Route(
              path: '/past',
              title: 'Event archive · happening.tech',
              builder: (_, _) => a(id: 'legacy-archive', href: 'archive/', [.text('Open the event archive')]),
            ),
            Route(
              path: '/notifications',
              title: 'Notifications · happening.tech',
              builder: (_, _) => const NotificationsPage(),
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
        a(href: './', classes: 'footer-brand', [.text('happening.tech')]),
        nav(
          attributes: {'aria-label': 'Community'},
          [
            a(href: 'archive/', [.text('Event archive')]),
            for (final (href, label, glyph) in [
              ('notifications/', 'Notifications', 'bell'),
              ('https://github.com/$projectRepository/blob/main/CONTRIBUTING.md', 'Contribute', 'pull-request'),
            ])
              a(href: href, classes: 'community-action', [
                motionSlot(glyph, icon(glyph)),
                .text(label),
              ]),
          ],
        ),
      ]),
    ]);
  }
}
