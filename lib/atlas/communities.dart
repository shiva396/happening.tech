import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/icon.dart';
import '../event.dart';
import '../project.dart';
import 'presentation.dart';

Component communityCard(Community c, Iterable<Event> events) {
  final location = locationName(c.city, c.country);
  final count = events
      .where((e) => e.communityId == c.id && e.status != 'cancelled' && !pastEvent(e, DateTime.now()))
      .length;
  return article(
    classes: 'community-card',
    attributes: {'data-directory-id': c.id, 'data-place': location, 'data-country': c.country, 'data-name': c.name},
    [
      communityIdentity(c),
      div([
        h3([
          a(href: 'communities/${c.id}/', [.text(c.name)]),
        ]),
        p([.text(location.isEmpty ? 'Location not listed' : location)]),
        if (count > 0) small([.text('$count upcoming ${count == 1 ? 'event' : 'events'}')]),
      ]),
    ],
  );
}

class Communities extends StatelessComponent {
  const Communities(this.communities, this.events, {this.directory = false, super.key});
  final List<Community> communities;
  final List<Event> events;
  final bool directory;
  @override
  Component build(BuildContext context) {
    final countries = communities.map((c) => c.country).where((country) => country.isNotEmpty).toSet().toList()..sort();
    final curated = [...communities]
      ..sort((left, right) {
        if (left.id == right.id) return 0;
        if (left.id == 'namma-flutter') return -1;
        if (right.id == 'namma-flutter') return 1;
        return left.name.compareTo(right.name);
      });
    return section(id: 'communities', classes: 'section communities', [
      if (directory) pageHead('Global Flutter communities', 'communities/'),
      div(classes: 'section-inner', [
        div(classes: 'split-heading', [
          if (directory) h1([.text('Flutter communities')]) else h2([.text('Flutter communities')]),
        ]),
        div(classes: 'filter-bar enhanced', [
          label(classes: 'search-field', [
            icon('search'),
            input(
              type: InputType.search,
              id: 'community-query',
              attributes: {'placeholder': 'Search by name or location', 'aria-label': 'Search communities'},
            ),
          ]),
          label(classes: 'select-field', [
            select(
              id: 'community-country',
              attributes: {'aria-label': 'Filter communities by country'},
              [
                option(value: '', [.text('All countries')]),
                for (final c in countries) option(value: c, [.text(c)]),
              ],
            ),
            icon('chevron-down'),
          ]),
        ]),
        div(classes: 'community-grid', [
          for (final c in curated) communityCard(c, events),
        ]),
        p(
          id: 'community-empty',
          classes: 'empty-state',
          attributes: {if (communities.isNotEmpty) 'hidden': ''},
          [.text('No communities match your search.')],
        ),
        a(classes: 'text-link directory-contribute', href: '$contributionGuide#add-a-community', [
          icon('plus'),
          .text('Suggest a community'),
        ]),
      ]),
    ]);
  }
}
