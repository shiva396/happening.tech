import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/icon.dart';
import '../event.dart';
import '../project.dart';
import 'presentation.dart';

class EventDetails extends StatelessComponent {
  const EventDetails(this.event, {this.legacy = false, super.key});
  final Event event;
  final bool legacy;
  @override
  Component build(BuildContext context) {
    final e = event;
    final path = 'events/${e.slug}/';
    final isPast = pastEvent(e, DateTime.now());
    final schemaStatus = switch (e.status) {
      'cancelled' => 'EventCancelled',
      'rescheduled' => 'EventRescheduled',
      _ => 'EventScheduled',
    };
    return article(classes: 'section-inner detail-page', [
      pageHead(
        e.title,
        path,
        description: e.description,
        image: eventImage(e),
        structured: {
          '@context': 'https://schema.org',
          '@type': 'Event',
          'name': e.title,
          'description': e.description,
          'startDate': e.start,
          'endDate': e.end,
          'url': e.url,
          'eventStatus': 'https://schema.org/$schemaStatus',
          'image': [publicUrl(eventImage(e))],
          'eventAttendanceMode':
              'https://schema.org/${switch (e.attendance) {
                'Online' => 'Online',
                'Hybrid' => 'Mixed',
                _ => 'Offline',
              }}EventAttendanceMode',
          'location': e.attendance == 'Online'
              ? {'@type': 'VirtualLocation', 'url': e.url}
              : {
                  '@type': 'Place',
                  'name': e.venue,
                  'address': {'@type': 'PostalAddress', 'addressLocality': e.city, 'addressCountry': e.country},
                },
          'organizer': {
            '@type': 'Organization',
            'name': e.community,
            if (!legacy) 'url': publicUrl('communities/${e.communityId}/'),
          },
        },
      ),
      a(classes: 'text-link', href: isPast ? 'archive/#program' : './#program', [icon('list'), .text('Event program')]),
      div(classes: 'detail-layout', [
        div([
          overline('calendar-days', legacy ? 'Archived listing' : e.category),
          h1([.text(e.title)]),
          p(classes: 'section-lede', [.text(e.description)]),
          div(classes: 'detail-facts', [
            p([icon('calendar-days'), .text(displayDate(e))]),
            if (!e.allDay)
              p([icon('clock-3'), .text('${hostDay(e).toIso8601String().substring(11, 16)} · ${e.timezone}')]),
            p([
              icon('map-pin'),
              .text([e.venue, eventPlace(e)].where((v) => v.isNotEmpty).toSet().join(' · ')),
            ]),
            p([
              icon('users'),
              if (legacy) .text(e.community) else a(href: 'communities/${e.communityId}/', [.text(e.community)]),
            ]),
            p([
              icon('tag'),
              .text([e.attendance, if (e.status != 'scheduled') e.status, ?e.price].join(' · ')),
            ]),
          ]),
          div(classes: 'inline-actions', [
            a(
              classes: 'pill solid',
              href: e.activeRegistrationUrl ?? e.url,
              attributes: {
                if (e.activeRegistrationUrl != null) ...{
                  'data-registration-until':
                      (e.registrationEnds != null && e.registrationEnds!.isBefore(e.endsAtExclusive)
                              ? e.registrationEnds!
                              : e.endsAtExclusive)
                          .toUtc()
                          .toIso8601String(),
                  'data-organizer-url': e.url,
                },
              },
              [
                .text(
                  e.activeRegistrationUrl != null
                      ? e.registrationLabel ?? 'Register with organizer'
                      : 'Organizer’s event page',
                ),
              ],
            ),
            calendarLink(e),
            if (!legacy && e.latitude != null)
              a(classes: 'pill', href: './?event=${e.id}#world', [icon('globe'), .text('Find on globe')]),
          ]),
        ]),
        figure([
          img(classes: 'detail-image', src: eventImage(e), alt: ''),
          if (e.artworkCredit != null)
            figcaption([
              if (e.artworkSource != null)
                a(href: e.artworkSource!, [.text(e.artworkCredit!)])
              else
                .text(e.artworkCredit!),
            ]),
        ]),
      ]),
    ]);
  }
}

class CommunityDetails extends StatelessComponent {
  const CommunityDetails(this.community, this.events, {super.key});
  final Community community;
  final List<Event> events;
  @override
  Component build(BuildContext context) {
    final c = community;
    final related = events.where((e) => e.communityId == c.id);
    final now = DateTime.now();
    return article(classes: 'section-inner detail-page', [
      pageHead(c.name, 'communities/${c.id}/', description: c.description),
      a(classes: 'text-link', href: 'communities/', [icon('users'), .text('All communities')]),
      div(classes: 'community-profile', [
        communityIdentity(c),
        overline('map-pin', locationName(c.city, c.country)),
        h1([.text(c.name)]),
        p(classes: 'section-lede', [.text(c.description)]),
        div(classes: 'inline-actions', [
          a(classes: 'pill solid', href: c.url, [.text('Official community site')]),
          if (c.latitude != null)
            a(classes: 'pill', href: './?community=${c.id}#world', [icon('globe'), .text('Find on globe')]),
          for (final url in c.links.where((url) => url != c.url))
            a(classes: 'text-link', href: url, [.text(Uri.parse(url).host)]),
        ]),
      ]),
      for (final past in [false, true])
        div(classes: 'related-events', [
          h2([.text(past ? 'Past gatherings' : 'Upcoming gatherings')]),
          if (!related.any((e) => pastEvent(e, now) == past))
            p([.text(past ? 'No past gatherings listed.' : 'No upcoming gatherings listed yet.')]),
          for (final e in (past ? related.toList().reversed : related).where((e) => pastEvent(e, now) == past))
            a(href: 'events/${e.id}/', [
              span([.text(displayDate(e))]),
              strong([.text(e.title)]),
              icon('chevron-right'),
            ]),
        ]),
    ]);
  }
}
