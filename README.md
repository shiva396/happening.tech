# flutter.spot

A community programme of developer events, built with Jaspr and published on GitHub Pages. Browse upcoming events in Programme or World view. Open **Event archive** in the footer for completed listings.

## Run locally

With Dart 3.14 installed:

```sh
dart pub get
dart pub global activate jaspr_cli 0.24.0-beta.2
dart pub global run jaspr_cli:jaspr serve
```

Open [the local preview](http://localhost:8080). Build the static site with `dart pub global run jaspr_cli:jaspr build`. Shared colours, type, sizing, and motion settings live in [web/constants](web/constants/).

## Contribute

Use **List an event** to prepare a listing. **Contribute** opens the [GitHub contribution guide](CONTRIBUTING.md). A maintainer reviews the pull request before it goes live.

## Notifications

Open **Notifications** in the footer to manage alerts for this device or follow listing changes in a feed reader. Browser alerts announce newly added events after publication.

Maintainers can enable browser delivery using the [Web Push setup guide](tool/push/README.md). The feed works immediately.
