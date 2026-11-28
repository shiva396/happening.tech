import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/icon.dart';
import '../event.dart';
import '../project.dart';
import 'presentation.dart';

class WorldView extends StatelessComponent {
  const WorldView(
    this.events,
    this.communities,
    this.pages, {
    this.permanentView,
    this.latitude,
    this.longitude,
    super.key,
  });
  final List<Event> events;
  final List<Community> communities;
  final List<Component> pages;
  final String? permanentView;
  final double? latitude, longitude;

  Component _control(String key, String label, String glyph) =>
      button(attributes: {'type': 'button', 'data-camera': key, 'aria-label': label, 'title': label}, [icon(glyph)]);

  @override
  Component build(BuildContext context) {
    final standalone = permanentView != null;
    final countries = {...communities.map((c) => c.country), ...events.map((e) => e.country)}..remove('');
    final upcoming = events.where((e) => !pastEvent(e, DateTime.now()) && e.status != 'cancelled').length;
    return section(
      id: 'world',
      classes: 'world',
      attributes: standalone ? {'aria-label': 'Flutter community globe'} : {'aria-labelledby': 'world-heading'},
      [
        if (!standalone) h1(id: 'world-heading', classes: 'sr-only', [.text('Flutter community globe')]),
        div(
          classes: standalone ? 'world-frame inside permalink' : 'world-frame',
          attributes: {if (standalone) 'data-view': permanentView!},
          [
            div(classes: 'world-sky', attributes: {'aria-hidden': 'true'}, []),
            div(
              classes: 'world-scene',
              attributes: {if (standalone) 'inert': ''},
              [
                div(
                  classes: 'atlas-earth',
                  attributes: {
                    if (latitude != null && longitude != null) ...{'data-lat': '$latitude', 'data-lon': '$longitude'},
                  },
                  [
                    img(
                      classes: 'atlas-earth-poster',
                      src: 'art/world-poster.webp',
                      width: 896,
                      height: 896,
                      attributes: {'fetchpriority': 'high'},
                      alt: 'Earth looking towards Europe, Africa and Asia',
                    ),
                  ],
                ),
              ],
            ),
            div(classes: 'world-top', [
              brand(),
              div(classes: 'world-tools', [
                if (standalone)
                  a(classes: 'pill enhanced', href: './#find', [icon('search'), .text('Find a place')])
                else
                  details(id: 'find', classes: 'locator enhanced', [
                    summary([
                      icon('search'),
                      span([.text('Find a place')]),
                      span(classes: 'locator-shortcut', attributes: {'aria-hidden': 'true'}, [.text('/')]),
                    ]),
                    div(classes: 'locator-popover', [
                      input(
                        type: InputType.search,
                        id: 'locate',
                        attributes: {
                          'aria-label': 'Find a city, country or community',
                          'placeholder': 'City, country or community',
                        },
                      ),
                      div(id: 'location-results', []),
                    ]),
                  ]),
                details(classes: 'atlas-info', [
                  summary(attributes: {'aria-label': 'About the atlas', 'title': 'About the atlas'}, [icon('compass')]),
                  div(classes: 'info-page', [
                    h2([.text('The community atlas')]),
                    dl(classes: 'atlas-totals', [
                      dt([.text('Countries')]),
                      dd([.text('${countries.length}')]),
                      dt([.text('Upcoming events')]),
                      dd(id: 'upcoming-total', [.text('$upcoming')]),
                      dt([.text('Communities')]),
                      dd([.text('${communities.length}')]),
                    ]),
                    nav(
                      attributes: {'aria-label': 'Atlas resources'},
                      [
                        a(href: 'submit/', [.text('List an event')]),
                        a(href: 'notifications/', [.text('Notifications')]),
                        a(href: contributionGuide, [.text('Contribute on GitHub')]),
                      ],
                    ),
                    footer(classes: 'credit-line', [
                      a(classes: 'atlas-credit', href: nammaWebsite, [
                        .text('Made with love by Shiva and Justin from NammaFlutter'),
                      ]),
                      if (!standalone) div(classes: 'dash-slot', attributes: {'data-perch': 'footer'}, []),
                    ]),
                  ]),
                ]),
              ]),
            ]),
            if (!standalone)
              div(
                classes: 'dash-perch',
                attributes: {'data-perch': 'world'},
                [
                  button(
                    classes: 'dash-host',
                    attributes: {
                      'type': 'button',
                      'data-dash': '',
                      'aria-label': 'Say hello to Dash',
                      'title': 'Say hello to Dash',
                    },
                    [
                      img(src: 'art/dash.webp', width: 256, height: 256, alt: ''),
                    ],
                  ),
                ],
              ),
            if (!standalone)
              div(
                id: 'world-preview',
                classes: 'world-preview',
                attributes: {'hidden': '', 'aria-label': 'Selected place', 'aria-live': 'polite'},
                [],
              ),
            div(
              classes: 'globe-pages',
              attributes: {'aria-label': 'Explore the atlas', 'role': 'region'},
              [
                ...pages,
                if (!standalone) ...[
                  for (final name in ['submit', 'notifications'])
                    section(
                      id: name,
                      attributes: {'hidden': '', 'aria-label': name == 'submit' ? 'List an event' : 'Notifications'},
                      [],
                    ),
                  section(
                    id: 'place',
                    attributes: {'hidden': '', 'aria-label': 'Local gatherings and communities'},
                    [],
                  ),
                  section(id: 'globe-story', attributes: {'hidden': '', 'aria-label': 'Place details'}, []),
                ],
              ],
            ),
            if (!standalone)
              div(classes: 'world-position', [
                icon('navigation'),
                span(
                  classes: 'coordinates',
                  attributes: {'aria-label': 'Camera coordinates'},
                  [.text('25.0° N  /  42.0° E')],
                ),
              ]),
            nav(
              classes: 'world-dock',
              attributes: {'aria-label': 'Globe views'},
              [
                for (final (mode, label, glyph) in [
                  ('world', 'Globe', 'globe'),
                  ('program', 'Program', 'calendar-days'),
                  ('communities', 'Communities', 'users'),
                  ('activity', 'Activity', 'radio'),
                ])
                  a(
                    href: './#$mode',
                    attributes: {
                      if (!standalone) 'data-view': mode,
                      if (permanentView == mode) 'aria-current': 'page',
                      'aria-label': mode == 'program' ? 'Program view' : label,
                    },
                    [
                      icon(glyph),
                      span([.text(label)]),
                    ],
                  ),
              ],
            ),
            if (!standalone)
              div(
                classes: 'camera-controls enhanced',
                attributes: {'role': 'group', 'aria-label': 'World controls'},
                [
                  _control('out', 'Zoom out', 'minus'),
                  _control('in', 'Zoom in', 'plus'),
                  _control('reset', 'Reset orientation', 'target'),
                  _control('motion', 'Pause animations', 'pause'),
                ],
              ),
          ],
        ),
      ],
    );
  }
}
