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
        script(src: '/theme.js'),
        link(href: '/programme.css', rel: 'stylesheet'),
        link(href: '/favicon.ico?v=globe', rel: 'icon', type: 'image/x-icon'),
        script(src: '/motion.js', defer: true),
        script(src: '/programme.js', defer: true),
      ],
      body: App(loadEvents()),
    ),
  );
}
