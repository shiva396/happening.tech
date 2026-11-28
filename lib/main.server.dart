import 'package:jaspr/dom.dart';
import 'package:jaspr/server.dart';

import 'app.dart';
import 'event.dart';
import 'main.server.options.dart';
import 'project.dart';

void main() {
  Jaspr.initializeApp(options: defaultServerOptions);
  final communities = loadCommunities();
  runApp(
    Document(
      lang: 'en',
      base: const String.fromEnvironment('SITE_BASE_PATH', defaultValue: '/'),
      title: projectName,
      meta: const {'description': projectDescription, 'theme-color': '#f2f8fc'},
      head: [
        link(href: 'manifest.webmanifest', rel: 'manifest'),
        link(href: 'art/atlas-mark.svg', rel: 'icon', type: 'image/svg+xml'),
        link(
          href: 'fonts/source-sans-3-latin.woff2',
          rel: 'preload',
          type: 'font/woff2',
          attributes: {'as': 'font', 'crossorigin': 'anonymous'},
        ),
        link(href: 'constants/atlas.css', rel: 'stylesheet'),
        link(href: 'atlas.css', rel: 'stylesheet'),
        link(href: 'world/world.css', rel: 'stylesheet'),
        link(href: 'world/frame.css', rel: 'stylesheet'),
        script(src: 'discovery/app.js', attributes: {'type': 'module'}),
      ],
      body: App(loadEvents(), communities, loadLegacyEvents()),
    ),
  );
}
