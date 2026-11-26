import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

/// Keeps the static glyph visible until the optional Lottie player is ready.
Component motionSlot(String animation, Component glyph) => span(
  classes: 'motion-slot',
  attributes: {'data-motion': animation, 'aria-hidden': 'true'},
  [
    span(classes: 'motion-glyph', [glyph]),
  ],
);
