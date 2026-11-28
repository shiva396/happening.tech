import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';
import 'atlas/communities.dart';
import 'atlas/details.dart';
import 'atlas/presentation.dart';
import 'atlas/world.dart';
import 'event.dart';
import 'pages/home.dart';
import 'pages/submit.dart';
import 'pages/notifications.dart';

class App extends StatelessComponent {
  final List<Event> events;
  final List<Event> legacy;
  final List<Community> communities;
  const App(this.events, this.communities, this.legacy, {super.key});

  @override
  Component build(BuildContext context) {
    final path = Uri.parse(context.url).path.replaceFirst(RegExp(r'/$'), '');
    final home = path.isEmpty || path == '/world';
    final content = main_(id: 'content', [
      Router(
        routes: [
          for (final path in ['/', '/world']) Route(path: path, builder: (_, _) => Atlas(events, communities)),
          for (final path in ['/archive', '/past'])
            Route(path: path, builder: (_, _) => Atlas(events, communities, archive: true)),
          Route(path: '/communities', builder: (_, _) => Communities(communities, events, directory: true)),
          for (final c in communities)
            Route(path: '/communities/${c.id}', builder: (_, _) => CommunityDetails(c, events)),
          for (final e in events) Route(path: '/events/${e.id}', builder: (_, _) => EventDetails(e)),
          for (final e in legacy) Route(path: '/events/${e.id}', builder: (_, _) => EventDetails(e, legacy: true)),
          Route(
            path: '/notifications',
            builder: (_, _) =>
                Component.fragment([pageHead('Notifications', 'notifications/'), const NotificationsPage()]),
          ),
          Route(
            path: '/submit',
            builder: (_, _) =>
                Component.fragment([pageHead('List a Flutter event', 'submit/'), SubmitPage(communities)]),
          ),
        ],
      ),
    ]);
    final community = path.startsWith('/communities/')
        ? communities.where((c) => path == '/communities/${c.id}').firstOrNull
        : null;
    final event = path.startsWith('/events/')
        ? [...events, ...legacy].where((e) => path == '/events/${e.id}').firstOrNull
        : null;
    final section = path.split('/').elementAtOrNull(1);
    final chapter = switch (section) {
      'events' || 'archive' || 'past' => 'program',
      _ => section,
    };
    return div(classes: 'globe-site', [
      a(href: home ? './#program' : '.$path/#content', classes: 'skip', [.text('Skip to content')]),
      if (home)
        content
      else
        WorldView(
          events,
          communities,
          [content],
          permanentView: chapter,
          latitude: community?.latitude ?? event?.latitude,
          longitude: community?.longitude ?? event?.longitude,
        ),
    ]);
  }
}
