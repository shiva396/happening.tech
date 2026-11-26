import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

Component icon(String name) => svg(
  classes: 'icon',
  viewBox: '0 0 24 24',
  attributes: {'aria-hidden': 'true'},
  [
    Component.element(tag: 'use', attributes: {'href': '/art/icons.svg#$name'}),
  ],
);
