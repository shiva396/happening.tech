import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import '../atlas/activity.dart';
import '../atlas/communities.dart';
import '../atlas/presentation.dart';
import '../atlas/program.dart';
import '../atlas/world.dart';
import '../event.dart';

class Atlas extends StatelessComponent {
  const Atlas(this.events, this.communities, {this.archive = false, super.key});
  final List<Event> events;
  final List<Community> communities;
  final bool archive;
  @override
  Component build(BuildContext context) => div(id: 'atlas', [
    pageHead(archive ? 'Past Flutter events' : 'The global Flutter atlas', archive ? 'archive/' : ''),
    dataIsland(events, communities),
    if (!archive) WorldView(events, communities),
    ProgramView(events, archive: archive),
    Communities(communities, events),
    Activity(events),
  ]);
}
