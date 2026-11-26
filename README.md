# happening.tech

A community-built programme of developer events. Browse by location or topic, explore the world map, and follow a listing to the organizer for registration. Each event has a shareable page and a downloadable calendar entry.

## Run locally

With Dart 3.14 installed, run the following from the project directory.

```sh
dart pub global activate jaspr_cli 0.24.0-beta.2
dart pub get
dart pub global run jaspr_cli:jaspr serve
```

Open http://localhost:8080. For a production build, run `dart pub global run jaspr_cli:jaspr build`. The static site is generated in `build/jaspr/`.

## Interface theme

The [design constants](web/constants/) are CSS custom properties shared by every Jaspr page. Change [control sizes and padding](web/constants/controls.css) for buttons, inputs, and map controls, including their mobile and touch variants. The folder also holds [colors](web/constants/colors.css), [typography](web/constants/typography.css), [spacing](web/constants/spacing.css), [layout dimensions](web/constants/layout.css), [visual effects](web/constants/effects.css), and [motion](web/constants/motion.css). Component styles select the tokens for each state and breakpoint. The [navigation artwork palette](web/constants/navigation-art.json) is applied when baking the monkey and koala.

## Contribute an event

Use **List an event** to preview a listing and download its TOML file. Add that file to `events/`, run `dart run tool/validate.dart`, and open a pull request. Existing files show how to represent date-only and timed events. Use the official organizer’s URL and include a registration URL only when it is available.

The Pages workflow builds and publishes the static site on pushes to `main`. It sets the site’s base path and the GitHub repository for the contribution form. Contributors can use **Propose on GitHub** to open a pull request for maintainer review.

The directory and event pages are rendered at build time. Rebuild after changing a listing. The browser hides expired events from the programme. World view opens over India. Drag to rotate the globe. Pinch to zoom, or use the plus and minus controls. A two-finger trackpad scroll moves the page. Select a country on the globe or in the country list to browse its upcoming events. The locally hosted globe uses Natural Earth boundaries from World Atlas and an orthographic projection from D3 Geo.

[Project plan](PLAN.md)
