# Rethink the Entire Global Flutter Community Platform

## 1. Product Vision

Completely rethink the existing website from first principles. Do not treat this as a conventional website redesign or an incremental improvement to the existing layout.

We are building an interactive, living world of Flutter.

The platform should become a global discovery space exclusively for:

- Flutter conferences
- Flutter meetups
- Flutter workshops
- Flutter hackathons
- Flutter community gatherings
- Flutter developer communities

The fundamental idea is to make the entire Flutter ecosystem geographically explorable.

The experience should be so distinctive, immersive, responsive and thoughtfully engineered that people would be surprised to learn it was built using Jaspr, a static-first Dart web framework.

Do not compromise performance for visual sophistication. Both must coexist.

## 2. Design References

Use the following references to establish the experience:

**World View:** The attached reference image showing a three-dimensional Earth with floating, geographically anchored photo cards. Also take inspiration from the Places experience in Apple Photos.

**Program View:** https://shipaton.com/events

Take inspiration from RevenueCat's event presentation, information hierarchy, community-driven content and visual storytelling.

Do not reproduce either reference directly. Establish an original visual identity that belongs to the Flutter ecosystem.

## 3. Overall Experience

Remove the conventional app bar entirely.

Avoid the typical website structure consisting of a navigation bar, marketing hero, feature sections and generic cards.

The world itself should be the primary interface.

The overall page structure should be:

1. Immersive World View
2. Program View
3. Global Flutter Communities
4. Global Event Activity
5. Minimal Footer

All sections should feel like interconnected parts of a single experience rather than independently designed web pages.

## 4. Immersive 3D World View

The first viewport should predominantly be occupied by a beautifully rendered, interactive 3D Earth.

The Earth should feel tangible, geographically accurate and alive.

### Globe appearance

- High-quality geographical representation.
- Flutter-inspired blue oceans.
- Subtle icy-blue landmasses.
- Refined geographical boundaries.
- Soft atmospheric glow.
- Subtle environmental lighting and depth.
- Carefully controlled shadows.
- Minimal background distractions.
- No excessive sci-fi effects or unnecessary visual noise.

Retain the dimensional quality of the reference image while adapting the visual treatment to the Flutter colour system.

### Globe interactions

- Drag to rotate the globe.
- Scroll or pinch to zoom.
- Smooth inertial movement.
- Gentle automatic rotation when idle.
- Stop automatic rotation when the user interacts.
- Smooth camera transitions between geographical locations.
- Select a country or city to explore its Flutter ecosystem.
- Provide an elegant reset mechanism.
- Support mouse, touch and keyboard interactions.

The globe should never fight against the user's input.

### Geographically anchored event cards

Do not represent every event using ordinary map pins.

Instead, take inspiration from Apple Photos and the attached globe reference.

Represent events using small, floating photographic cards anchored to their actual geographical locations.

At the world level, group nearby events into visual clusters.

As the user zooms in:

- Country-level clusters reveal regional clusters.
- Regional clusters reveal cities.
- Cities reveal individual events.
- Individual events reveal richer information.

Cards should progressively disclose information rather than overwhelming the globe.

A cluster could contain stacked event photographs with a small count indicating how many events exist in that area.

Cards must:

- Remain readable while the Earth rotates.
- Maintain a meaningful spatial connection with their geographical location.
- Avoid overlapping important neighbouring cards.
- Disappear naturally when their locations move behind the Earth.
- Transition smoothly between cluster and individual states.
- Scale appropriately based on zoom and screen size.

Use blue-toned anchors rather than conventional red map pins.

### Event selection

When an individual event is selected:

- Smoothly rotate the Earth towards its location.
- Bring the corresponding event card into focus.
- Reveal an elegant event preview using a floating panel or contextual sheet.
- Display its name, date, location, community, event category and registration link.
- Allow the user to explore the associated community.

Avoid large modal dialogs that completely interrupt the spatial experience.

### Ambient world activity

Introduce subtle data-driven activity across the globe.

For example:

- A newly published event creates a gentle ripple around its geographical location.
- An ongoing event has a restrained breathing animation.
- A city with multiple upcoming events displays a subtle cluster indicator.
- Selecting a community reveals its upcoming events.
- Recent activity can briefly highlight a particular region.

Every visual indicator must represent meaningful information.

Do not fabricate activity merely for decoration.

## 5. Floating Interface Elements

Do not introduce a traditional navigation bar.

Instead, position a minimal set of contextual controls around the viewport.

### Top left

A small, carefully designed identity for the platform.

The identity should remain visually understated because the world itself is the main attraction.

### Top right

A prominent but minimal Program View control.

Selecting Program View should smoothly navigate to the program section below the globe.

When the user is browsing the program, provide an equally intuitive way to return to the world.

Preserve relevant country, city and event selections between the two views.

### Bottom left

A small, data-driven overview of the global Flutter ecosystem:

- Countries represented
- Upcoming events
- Listed communities

Use actual available data rather than hardcoded marketing statistics.

### Bottom right

Minimal globe controls where necessary:

- Zoom
- Reset orientation
- Find a location
- Animation preferences

Keep controls unobtrusive and reveal additional functionality only when needed.

## 6. Dash: A Living Character

Introduce a high-quality 3D model of Flutter's Dash mascot.

Dash should not merely be a decorative character floating in a corner.

Dash should feel like a small inhabitant of the Flutter world, with personality, curiosity and a relationship with the user's interactions.

Create a coherent character behaviour system rather than scattered animations.

### Ambient behaviours

Dash can occasionally:

- Fly around a portion of the globe.
- Land on an event card.
- Sit on the edge of the viewport.
- Observe the rotating Earth.
- Look towards an event selected by the user.
- Peek from behind interface elements.
- Rest when the user remains idle.
- Travel between geographically distant points.
- Carry a small event postcard.
- Curiously inspect newly revealed communities.

Movement should feel organic, purposeful and varied.

Avoid repetitive fixed trajectories or constant movement.

### Contextual behaviours

When the user selects an event, Dash may fly towards its location.

When the user enters Program View, Dash can transition into the program section.

When a user filters events by country, Dash may briefly acknowledge the selection.

When no matching events are found, Dash can appear with a small telescope, accompanied by a useful empty-state message.

When a user discovers a community, Dash can briefly interact with its card.

When a user reaches the footer, Dash can settle down or rest.

These interactions should be subtle, infrequent and delightful.

### Easter eggs

Introduce a few discoverable interactions:

- Clicking Dash repeatedly triggers a rare playful reaction.
- Rotating the globe through a complete revolution may unlock a short orbital animation.
- A rare idle behaviour where Dash falls asleep.
- Dash occasionally discovers a tiny Dart symbol.
- Secret interactions with certain interface elements.
- A small acknowledgement when users explore multiple continents.

Easter eggs must never obstruct core functionality or become prerequisites for using the website.

### Character architecture

Design Dash using an explicit behaviour system.

Potential states:

- Idle
- Observing
- Flying
- Landing
- Resting
- Sleeping
- Celebrating
- Reacting
- Transitioning

Use contextual events, weighted behaviour selection, cooldowns and animation transitions.

Separate character behaviour from rendering.

Dash should respond to application events without becoming tightly coupled to individual UI components.

Pause unnecessary character animations when Dash is outside the viewport, the browser tab is hidden, or the user requests reduced motion.

## 7. Program View

The Program View should be inspired by RevenueCat's Shipaton event experience while maintaining our own visual language.

This section is for users who prefer practical event discovery over spatial exploration.

The transition from World View to Program View should feel intentional and connected.

### Section introduction

Use a strong but minimal editorial heading.

Possible copy:

"Flutter happens everywhere."

Or:

"Find your next Flutter gathering."

Avoid excessive introductory text.

### Event discovery controls

Provide an elegant, compact filtering system:

- Search
- Country
- City
- Date range
- Event type
- Online, in-person or hybrid
- Upcoming and past events

Filters should be composable and reflected in URL parameters where appropriate.

Avoid a large, conventional filter sidebar.

Use compact controls with progressive disclosure.

### Event cards

Design visually rich, editorial-quality event cards.

Each card should contain:

- Event artwork or photograph
- Event name
- Date
- City and country
- Organizing Flutter community
- Event type
- Attendance format
- Event details or registration action

Prioritize information hierarchy and typography.

Cards should have restrained hover interactions:

- Gentle image movement
- Subtle elevation
- Refined transitions
- Contextual action reveal

Avoid excessive glassmorphism, oversized corner radii, exaggerated shadows or identical generic SaaS cards.

Use a responsive editorial grid that remains consistent across different image formats and content lengths.

When event artwork is unavailable, generate a deterministic Flutter-inspired placeholder using the event's location, name or community identity.

### Event organisation

Present upcoming events first, ordered chronologically.

Provide access to past events without mixing them indiscriminately with forthcoming events.

Allow users to navigate directly from an event card back to its geographical location on the globe.

The world and program should share the same selection state.

## 8. Global Flutter Communities

Introduce a dedicated community discovery section.

This section represents the people behind the events.

It should serve as a living directory of Flutter communities around the world, including communities that do not currently have an upcoming event.

For each community, provide:

- Community name
- Logo or visual identity
- City and country
- Short description
- Official community links
- Upcoming events
- Past events, when available

Allow users to:

- Discover communities by country.
- Search communities by name or location.
- View a community's geographical location.
- Explore events associated with a community.
- Visit its official website or social channels.
- Suggest a missing community.

Consider presenting communities as a beautifully arranged constellation of community identities, grouped geographically.

However, maintain an accessible, searchable directory as the underlying experience.

Initially, build the section with proper placeholders and empty states until sufficient community data is available.

Never invent community names, membership figures or activity metrics.

## 9. Global Event Activity

Towards the bottom of the page, introduce a section that reflects the pulse of the Flutter ecosystem.

Possible components:

- Recently announced events
- Events happening now
- Recently completed events
- Upcoming activity across countries
- Recently added communities
- Monthly event activity
- A calendar-based activity visualization

Consider a chronological activity stream that feels closer to an open-source contribution timeline than a social media feed.

All activity must be derived from the actual event and community dataset.

Avoid introducing meaningless dashboards or fabricated numbers.

The purpose is to communicate that Flutter is an active, global community.

## 10. Visual Identity

Use the Namma Flutter visual identity as the design foundation.

Inspect the existing brand assets and derive reusable design tokens from them before creating new styles.

The interface should remain within the Flutter colour family:

- Flutter blue
- Cyan
- Deep navy
- Ice blue
- White
- Blue-tinted neutrals

Do not introduce unrelated accent colours into the interface.

Authentic event photographs and community logos may retain their original colours.

Create a consistent design system covering:

- Typography
- Colour tokens
- Spacing
- Surface treatments
- Borders
- Shadows
- Elevation
- Motion
- Iconography
- Responsive behaviour

Typography should be modern, confident and highly readable.

Use whitespace deliberately.

Do not rely on decorative gradients, excessive glass effects or visual clutter to create a sense of modernity.

Modernity should emerge from composition, interaction, typography, precision and attention to detail.

## 11. Motion and Micro-interactions

Treat motion as part of the design language.

Every animation should serve one of the following purposes:

- Explain a relationship.
- Communicate a state change.
- Guide attention.
- Preserve spatial continuity.
- Provide feedback.
- Express character.

Introduce refined transitions for:

- Globe rotation
- Camera movement
- Event cluster expansion
- Event card selection
- Filtering
- Section navigation
- Community selection
- Loading states
- Empty states
- Dash behaviours

Create shared motion tokens for duration, easing, spring behaviour and stagger intervals.

Avoid each component defining unrelated animation parameters.

Do not animate everything simultaneously.

The interface should feel alive, but calm.

## 12. Technical Architecture

Continue using Jaspr as the primary web framework.

Do not migrate the entire application to Flutter Web, React or another framework simply to achieve the immersive experience.

Use Jaspr for:

- Page composition
- Static generation
- Semantic HTML
- Routing
- Event and community content
- Accessible controls
- SEO
- Responsive layouts
- Application-level state

Introduce a dedicated client-side rendering layer for the interactive 3D experience.

Evaluate suitable WebGL rendering approaches and use Dart-to-JavaScript interoperability where appropriate.

Choose the smallest reliable rendering solution that satisfies the requirements.

Do not build an entire custom 3D engine unnecessarily.

### Architectural separation

Separate the application into coherent modules:

- Event domain
- Community domain
- Data ingestion
- Shared discovery state
- Geographical indexing
- Spatial clustering
- Globe rendering
- Camera controller
- Spatial event overlays
- Dash behaviour system
- Dash rendering
- Motion system
- Design system
- Program View
- Community directory
- Activity visualization

The globe rendering layer should not own business logic.

Event cards, communities, filters and activity views must not depend directly on the 3D engine.

Treat the renderer as a replaceable presentation capability.

### Shared application state

Maintain a single coherent discovery model containing:

- Selected event
- Selected community
- Selected country
- Selected city
- Active filters
- Current discovery mode

The World View and Program View should represent different projections of the same underlying dataset.

Do not duplicate event filtering or selection logic across views.

Introduce an appropriate application event mechanism through which Dash and other secondary experiences can react to meaningful state changes.

Keep this mechanism simple. Do not introduce unnecessary architectural ceremony.

## 13. Event and Community Data

Retain the open-source, community-contribution model.

Support event discovery from:

- Meetup, through permitted APIs or integrations
- Official Flutter community listings
- Official community event pages
- Other approved and reliable sources
- Community-contributed TOML files

Use TOML contributions as a first-class ingestion source rather than a temporary fallback.

Allow contributors to submit events and communities through GitHub pull requests.

Create a normalized event model containing:

- Stable ID
- Title
- Description
- Start and end time
- Time zone
- Event type
- Attendance format
- Country
- City
- Latitude
- Longitude
- Venue
- Community ID
- Artwork
- Registration URL
- Source
- Last updated timestamp

Maintain a separate community model.

An event should reference its organizing community rather than duplicate community information.

Support events without physical coordinates, particularly online events. Do not assign them fake geographical locations.

Validate data during the build process.

Handle:

- Duplicate events across sources
- Missing artwork
- Invalid coordinates
- Time zone differences
- Cancelled events
- Rescheduled events
- Expired registration links
- Incomplete community information

Where appropriate, use scheduled data ingestion followed by static site regeneration.

Keep the platform lightweight and avoid introducing a backend unless there is a clear requirement for one.

## 14. Performance and Optimization

Performance is a core requirement, not a final polishing exercise.

The initial page should load quickly even on mid-range mobile devices.

Use progressive enhancement:

1. Render meaningful static HTML immediately.
2. Load the initial visual representation of the Earth.
3. Initialize the interactive globe when appropriate.
4. Progressively load detailed textures, event overlays and Dash.
5. Load secondary experiences only when needed.

The website must remain useful if the interactive renderer fails.

### Rendering optimization

- Use compressed 3D assets.
- Use appropriately sized and compressed textures.
- Cap device pixel ratio where necessary.
- Use adaptive rendering quality.
- Avoid unnecessary real-time shadows.
- Batch rendering operations where beneficial.
- Use efficient spatial indexing.
- Perform visibility and occlusion checks.
- Limit visible event overlays.
- Avoid unnecessary DOM updates during rendering.
- Render on demand when the scene is static.
- Release GPU and animation resources correctly.
- Pause rendering when the browser tab is hidden.

Use level-of-detail strategies for the globe and Dash.

Do not render all event cards simultaneously.

### Performance targets

Establish measurable performance budgets.

Aim for:

- Smooth interactions approaching 60 FPS on capable devices.
- A usable adaptive experience on lower-powered devices.
- Largest Contentful Paint within 2.5 seconds under representative conditions.
- Interaction to Next Paint within 200 milliseconds.
- Cumulative Layout Shift below 0.1.

Measure these rather than assuming they have been achieved.

Profile real devices and inspect memory consumption, GPU usage, frame timing and network overhead.

Do not load heavyweight libraries without evaluating their contribution.

## 15. Mobile Experience

Do not simply shrink the desktop design.

Design the mobile experience intentionally.

The globe should remain the primary experience, with appropriate touch controls and responsive card clustering.

Event details can appear through a compact bottom sheet.

Program View should have a natural vertical reading experience.

Reduce visual complexity and rendering quality when appropriate.

Dash should adapt its behaviour to the available viewport.

Prevent interactions from accidentally interfering with page scrolling.

Support different viewport sizes, mobile browser behaviour and safe areas.

## 16. Accessibility and Resilience

The immersive experience must not compromise accessibility.

- Support keyboard navigation.
- Provide meaningful labels for controls.
- Maintain sufficient colour contrast.
- Respect reduced-motion preferences.
- Provide accessible event and community listings.
- Ensure visible focus indicators.
- Avoid trapping users inside the globe.
- Support screen readers through semantic HTML.

Provide a lightweight static geographical representation or direct access to Program View if WebGL is unavailable.

Users must be able to discover every event without relying on the 3D globe.

Dash and decorative animations must never block essential functionality.

## 17. SEO and Discoverability

Preserve the advantages of Jaspr's static-first architecture.

Events and communities should have meaningful, shareable URLs.

Include:

- Semantic HTML
- Relevant page metadata
- Open Graph metadata
- Structured event data
- Sitemap
- Canonical URLs
- Crawlable event information
- Crawlable community information

The content should not exist exclusively inside a canvas.

Support deep links that can open a particular event, community, country or discovery state.

## 18. Engineering Principles

Prioritize:

- Simplicity
- Composability
- Reusability
- Clear responsibilities
- Deterministic data processing
- Sound abstractions
- Maintainable rendering integrations
- Measurable performance
- Graceful degradation

Do not create isolated implementations for similar interactions.

Do not hardcode visual values throughout the application.

Do not introduce abstractions without a concrete purpose.

Do not add dependencies merely to implement trivial interactions.

Inspect the existing codebase before deciding what to retain, replace or remove.

Preserve useful existing functionality and data pipelines.

Remove obsolete UI components and dead code introduced by the redesign.

## 19. Implementation Strategy

Do not immediately start adding visual effects to the existing website.

First, understand the current architecture and available assets.

Proceed in coherent stages:

**Phase 1:** Existing codebase analysis, information architecture, design tokens and shared domain models.

**Phase 2:** Globe rendering prototype, camera interactions and geographical coordinate projection.

**Phase 3:** Event clustering, spatial overlays and shared discovery state.

**Phase 4:** Program View, event cards, filters and responsive layouts.

**Phase 5:** Global community directory and activity visualization.

**Phase 6:** Dash model, behaviour system and contextual micro-interactions.

**Phase 7:** Accessibility, static rendering, SEO, profiling, performance optimization and cross-device testing.

Treat each stage as a functional, testable increment.

Do not leave important architectural problems unresolved while polishing animations.

## 20. Expected Quality

The final experience should not resemble an ordinary event listing website.

It should feel like:

- An atlas of the Flutter ecosystem.
- A spatial discovery experience.
- A community-powered open-source platform.
- A living environment inhabited by Dash.
- A demonstration of what is possible with Dart and Jaspr on the web.

Every interaction should feel deliberate.

Every visual element should have a reason to exist.

Every architectural decision should support the long-term evolution of the platform.

The experience should be sophisticated without being complicated, playful without being distracting, and visually ambitious without being expensive to operate.

Do not settle for the first implementation merely because it works.

Experiment, evaluate, simplify and refine.

Build something that Flutter developers would genuinely enjoy exploring and feel proud to contribute to.

The ultimate goal is not to build another website about Flutter.

It is to build a world for Flutter.


Think very rich in terms of Ui and UX.. you ask me when done with evertyhgin.. I will gie you the 2D of Namma Flutter dash.. you can make it 3d namma flutter dash.. and do this in a separate branch adn make it as a PR. make sure you keep the constants neatly..

go with lil blue and white combo... so it feels namma flutter vibes.. check website as well for themes https://nammaflutter.com/

and then in last make it as made with love by shiva and justin from NammaFlutter in a very compacr way...

Now, itself getting you the namma dash photo.. just 3d model it.. [Image #1]... and want one pplaceholder page for showing all commuiniites in the world as well..
