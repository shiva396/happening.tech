import 'package:jaspr/dom.dart';
import 'package:jaspr/server.dart';

import 'app.dart';
import 'event.dart';
import 'project.dart';
import 'main.server.options.dart';

void main() {
  Jaspr.initializeApp(options: defaultServerOptions);
  runApp(
    Document(
      lang: 'en',
      base: const String.fromEnvironment('SITE_BASE_PATH', defaultValue: '/'),
      title: 'The programme · $projectName',
      meta: const {
        'description': 'An independent guide to developer meetups, workshops and conferences around the world.',
      },
      head: [
        script(src: 'theme.js'),
        link(href: 'manifest.webmanifest', rel: 'manifest'),
        for (final sheet in ['colors', 'typography', 'spacing', 'controls', 'layout', 'effects', 'motion'])
          link(href: 'constants/$sheet.css', rel: 'stylesheet'),
        link(href: 'programme.css', rel: 'stylesheet'),
        link(href: 'favicon.ico?v=globe', rel: 'icon', type: 'image/x-icon'),
        script(src: 'motion.js', attributes: {'type': 'module'}),
        script(src: 'nav-playground.js', attributes: {'type': 'module'}),
        script(src: 'programme.js', defer: true),
      ],
      body: App(loadEvents()),
    ),
  );
}
