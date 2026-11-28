import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/icon.dart';
import '../event.dart';
import 'presentation.dart';

class WorldView extends StatelessComponent {
  const WorldView(this.events, this.communities, {super.key});
  final List<Event> events;
  final List<Community> communities;

  Component _stat(int value, String label, String glyph, {String? id}) => div(classes: 'stat', [
    icon(glyph),
    div([
      strong(id: id, [.text('$value')]),
      span([.text(label)]),
    ]),
  ]);
  Component _control(String key, String label, String glyph) =>
      button(attributes: {'type': 'button', 'data-camera': key, 'aria-label': label, 'title': label}, [icon(glyph)]);

  @override
  Component build(BuildContext context) {
    final countries = {
      ...communities.map((c) => c.country),
      ...events.where((e) => e.attendance != 'Online').map((e) => e.country),
    }..remove('');
    return section(
      id: 'world',
      classes: 'world',
      attributes: {'aria-labelledby': 'world-heading'},
      [
        div(classes: 'world-grid', attributes: {'aria-hidden': 'true'}, []),
        div(classes: 'world-interior', [
          div(classes: 'world-top', [
            brand(),
            homeLink('program', 'Program view', 'list'),
          ]),
          div(classes: 'world-intro', [
            overline('compass', 'Community atlas'),
            h1(id: 'world-heading', [
              .text('Flutter, '),
              br(),
              em([.text('everywhere.')]),
            ]),
            p([.text('Explore the places and people bringing Flutter developers together.')]),
            details(classes: 'locator enhanced', [
              summary([
                icon('search'),
                .text('Find a location'),
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
          ]),
          div(classes: 'world-scene', [
            div(
              classes: 'atlas-earth',
              attributes: {'aria-label': 'Interactive globe of Flutter events and communities'},
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
          ]),
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
          div(
            id: 'world-preview',
            classes: 'world-preview',
            attributes: {'hidden': '', 'aria-label': 'Selected place', 'aria-live': 'polite'},
            [],
          ),
          div(classes: 'world-bottom', [
            div(
              classes: 'world-stats',
              attributes: {'aria-label': 'Atlas totals'},
              [
                _stat(countries.length, 'Countries', 'globe'),
                _stat(
                  events.where((e) => !pastEvent(e, DateTime.now()) && e.status != 'cancelled').length,
                  'Upcoming events',
                  'calendar-days',
                  id: 'upcoming-total',
                ),
                _stat(communities.length, 'Communities', 'users'),
              ],
            ),
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
          ]),
        ]),
        div(classes: 'world-legend', [
          span([icon('globe'), .text('World view')]),
          span(classes: 'drag-hint enhanced', [icon('hand'), .text('Drag to rotate · Pinch to zoom')]),
          span(
            classes: 'coordinates',
            attributes: {'aria-label': 'Camera coordinates'},
            [.text('25.0° N  /  42.0° E')],
          ),
        ]),
      ],
    );
  }
}
