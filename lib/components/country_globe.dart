import 'dart:convert';
import 'dart:io';

import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import 'icon.dart';

class CountryGlobe extends StatelessComponent {
  const CountryGlobe(this.eventCountries, {super.key});
  final Set<String> eventCountries;

  // The build and the globe share one set of geographic names.
  static final _countries =
      (jsonDecode(File('web/art/countries.json').readAsStringSync())['objects']['countries']['geometries'] as List)
          .map((geometry) => geometry['properties']['name'] as String)
          .toSet();

  Component control(String action, String label, Component glyph) => button(
    type: ButtonType.button,
    attributes: {'data-globe-action': action, 'aria-label': label, 'title': label},
    [glyph],
  );

  @override
  Component build(BuildContext context) {
    final available = eventCountries.where((c) => c != 'Online').toList()..sort();
    final others = _countries.difference(eventCountries).toList()..sort();
    return section(
      classes: 'country-atlas',
      attributes: {'aria-label': 'Explore events by country'},
      [
        div(classes: 'globe-toolbar', [
          label([
            icon('globe'),
            span(classes: 'country-field-label', [.text('Country')]),
            select(id: 'country', [
              option(value: '', [.text('All countries')]),
              if (eventCountries.contains('Online')) option(value: 'Online', [.text('Online events')]),
              for (final group in [('With upcoming events', available), ('Other countries and territories', others)])
                Component.element(
                  tag: 'optgroup',
                  attributes: {'label': group.$1},
                  children: [
                    for (final name in group.$2)
                      option(value: name, attributes: {if (name == 'India') 'selected': ''}, [.text(name)]),
                  ],
                ),
            ]),
            icon('chevron-down'),
          ]),
        ]),
        div(classes: 'globe-stage', [
          Component.element(tag: 'canvas', classes: 'earth-surface', attributes: {'aria-hidden': 'true', 'hidden': ''}),
          img(classes: 'globe-fallback', src: '/art/globe-india.webp', alt: 'Globe centred on India'),
          svg(
            id: 'country-globe',
            viewBox: '72 0 376 350',
            attributes: {
              'role': 'img',
              'aria-label': 'Rotatable globe. Use the arrow keys to rotate, or choose a country above.',
              'tabindex': '0',
              'hidden': '',
            },
            [],
          ),
        ]),
        div(
          classes: 'globe-controls',
          attributes: {'hidden': ''},
          [
            span([.text('Drag to rotate')]),
            control('reset', 'Centre selected country', icon('globe')),
            control('out', 'Zoom out', .text('−')),
            control('in', 'Zoom in', icon('plus')),
          ],
        ),
        const script(src: '/country-globe.js', attributes: {'type': 'module'}),
      ],
    );
  }
}
