import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import 'icon.dart';

/// The links remain native anchors before the optional Lottie player upgrades.
class PlayfulNavigation extends StatelessComponent {
  const PlayfulNavigation(this.path, {required this.animals, super.key});

  final String path;
  final List<String> animals;

  @override
  Component build(BuildContext context) => nav(
    attributes: {'aria-label': 'Main navigation'},
    [
      Component.element(
        tag: 'nav-playground',
        attributes: {'data-cast': animals.join(' ')},
        children: [
          for (final (href, label, glyph, move) in [
            ('/', 'Programme', 'list', 'hop'),
            ('/world', 'World view', 'globe', 'orbit'),
          ])
            a(
              href: href,
              classes: 'nav-item',
              attributes: {
                if (href == '/'
                    ? path == '/' || path.startsWith('/past') || path.startsWith('/events/')
                    : path.startsWith('/world'))
                  'aria-current': 'page',
              },
              [
                icon(glyph),
                span(classes: 'nav-label', [.text(label)]),
                span(classes: 'nav-animal', attributes: {'aria-hidden': 'true', 'data-move': move}, []),
              ],
            ),
        ],
      ),
      button(
        id: 'theme-switch',
        attributes: {'type': 'button', 'aria-label': 'Switch theme'},
        [icon('moon'), icon('sun')],
      ),
    ],
  );
}
