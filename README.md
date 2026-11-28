# flutter.spot

The globe is the interface for exploring Flutter gatherings. Rotate the Earth, tap a country, or find a city to see its events and organizers. The bottom dock opens the program, community directory and activity inside the globe. Each listing also has a permanent HTML page with the same globe frame. The program, archive, directory and event pages work with JavaScript disabled.

## Run locally

Use Dart 3.14 and Jaspr CLI 0.24.0-beta.2.

```sh
dart pub get --enforce-lockfile
dart pub global activate jaspr_cli 0.24.0-beta.2
dart pub global run jaspr_cli:jaspr serve
```

Open the [local site](http://localhost:8080). The [browser checks](tool/browser/README.md) include the production build command for GitHub Pages.

## Explore and contribute

The event and community filenames are their permanent IDs. Contributors can prepare an event in the site's listing form, edit TOML directly, or import a permitted organizer export for review. A maintainer reviews proposals before publication. The directory includes communities with no upcoming events. [Contribution guide](CONTRIBUTING.md)

Notifications are available through the listing feed. Maintainers can configure opt-in browser notifications for newly published events. [Web Push setup](tool/push/README.md)

## Design and implementation

Jaspr generates the pages from the catalog. A shared URL state connects the program and globe. The globe opens with a satellite overview. Pinch or scroll to zoom towards a place. Two levels of local NASA Blue Marble tiles add regional detail as you move closer. Palette, typography, focus and control sizes live in the [design tokens](web/constants/atlas.css). [Design brief](docs/atlas/BRIEF.md) · [Project guide](PLAN.md) · [City photo credits](web/art/events/CREDITS.txt) · [Map data and library credits](web/vendor/globe/LICENSE.txt)
