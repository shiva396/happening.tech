import 'dart:io';

import 'package:flutter_spot/event.dart';

void main(List<String> arguments) {
  try {
    final communities = loadCommunities();
    final events = loadEvents(directory: arguments.isEmpty ? 'events' : arguments.single, communities: communities);
    final historical = loadLegacyEvents();
    final reserved = historical.map((event) => event.id).toSet();
    for (final event in events) {
      if (reserved.contains(event.id)) throw FormatException('Event id ${event.id} is already used by an archived URL');
    }
    stdout.writeln(
      'Validated ${events.length} Flutter events, ${communities.length} communities and ${historical.length} legacy URLs.',
    );
  } on Exception catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  }
}
