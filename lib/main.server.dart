import 'package:jaspr/dom.dart';
import 'package:jaspr/server.dart';

import 'app.dart';
import 'event.dart';
import 'main.server.options.dart';

void main() {
  Jaspr.initializeApp(options: defaultServerOptions);
  runApp(
    Document(
      lang: 'en',
      title: 'The programme · happening.tech',
      meta: const {
        'description': 'An independent guide to developer meetups, workshops and conferences around the world.',
      },
      head: [
        link(href: '/programme.css', rel: 'stylesheet'),
        link(href: '/art/mark.svg', rel: 'icon', type: 'image/svg+xml'),
        script(src: '/programme.js', defer: true),
      ],
      body: App(loadEvents()),
    ),
  );
}
