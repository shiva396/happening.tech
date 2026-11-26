import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import 'icon.dart';

/// The links remain native anchors before the optional Lottie player upgrades.
class PlayfulNavigation extends StatelessComponent {
  const PlayfulNavigation(this.path, {super.key});

  final String path;

  @override
  Component build(BuildContext context) => nav(
    attributes: {'aria-label': 'Main navigation'},
    [
      for (final (href, label, glyph, animal) in [
        ('/', 'Programme', 'list', 'monkey'),
        ('/world', 'World view', 'globe', 'koala'),
      ])
        a(
          href: '.$href',
          classes: 'nav-item',
          attributes: {
            if (href == '/'
                ? path == '/' || path.startsWith('/events/')
                : path.startsWith('/world'))
              'aria-current': 'page',
          },
          [
            icon(glyph),
            span(classes: 'nav-label', [.text(label)]),
            Component.element(
              tag: 'nav-performance',
              attributes: {'data-animal': animal, 'aria-hidden': 'true'},
              children: [
                span(classes: 'nav-plane nav-back', []),
                span(classes: 'nav-plane nav-front', []),
              ],
            ),
          ],
        ),
    ],
  );
}
