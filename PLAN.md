# World Tech Events

An open-source, global platform to discover tech events happening around the world, inspired by Tamilnadu.tech, but with a modern identity and a more intuitive discovery experience.

## The Plan

- Build the platform using Jaspr, leveraging the Dart ecosystem.
- Design a fresh, modern layout that makes discovering worldwide tech events interesting and effortless.
- Aggregate events from Meetup, official Flutter communities and other developer communities.
- Maintain a TOML-based event directory, allowing anyone to contribute an event through a GitHub PR.
- Automate event aggregation, duplicate detection and expiry of past events wherever possible.
- Make the entire project open source and community-driven.

## Event archive, contributions and notifications

- [x] Give completed events a searchable archive at `/archive/` and redirect old `/past/` bookmarks.
- [x] Link the footer’s **Contribute** action to the [GitHub contribution guide](CONTRIBUTING.md). Give **Contribute** and **Notifications** distinct animations.
- [x] Publish the listing feed, implement browser opt-in and opt-out, and configure the private subscription store and VAPID keys.
- [ ] Enable live push for newly published events. Host the subscription API over HTTPS, configure its URL and scoped GitHub token, and redeploy Pages. Verify that a subscribed device receives an alert with the site closed and that tapping it opens the event. Follow the [Web Push setup guide](tool/push/README.md).

## The Experience

Rather than building another conventional event listing website, we could make it feel like a living atlas of the global tech community.

- **World View:** An interactive world map showcasing upcoming events and active tech communities.
- **Timeline View:** A chronological stream of upcoming events across the world.
- **Explore View:** Discover events by technology, country, city, community or event type.
- **Around Me:** Discover events happening nearby.
- **Personalized Timezone:** Display event timings in the visitor's local timezone.
- **Event Cards:** Minimal, informative cards with direct registration links and calendar integration.
- **Community Discovery:** Explore developer communities and their upcoming events.

## Design Direction

- Minimal, modern and typography-driven.
- Fluid transitions and meaningful micro-interactions.
- Subtle animations that communicate how active the global tech community is.
- Light and dark themes.
- Responsive, accessible and fast.
- No unnecessary sign-ups or friction to discover events.

## Engineering Direction

- Jaspr with SEO-friendly rendering.
- A unified event schema, irrespective of where the event originates.
- Independent, extensible event source adapters.
- TOML-based community contributions with automated PR validation.
- Scheduled event synchronization through GitHub Actions or a similar service.
- Avoid unnecessary backend infrastructure initially.

## Launch

Start with Flutter and prominent developer communities, gradually expand across technologies, countries and ecosystems.

Keep the first release simple, delightful and useful enough that communities naturally want to contribute.

**One world. Every tech community. Endless discoveries.**
