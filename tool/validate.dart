import 'dart:io';

import 'package:flutter_spot/event.dart';

void main(List<String> arguments) {
  try {
    final events = loadEvents(directory: arguments.isEmpty ? 'events' : arguments.single);
    stdout.writeln('Validated ${events.length} event listings.');
  } on Exception catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  }
}
