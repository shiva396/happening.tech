# Contribute to flutter.spot

The atlas lists Flutter gatherings and the communities that organize them. A community can join before it has an event to announce. Contributions are reviewed on GitHub and published from the static Jaspr build.

## Add a community

Add one file to [communities](communities/). Its lowercase, hyphenated filename becomes its permanent ID and page URL. Supply a name and official website, organizer profile or Meetup group URL. Add the city, country, description, coordinates and official social channels when the group publishes them. A regional or online community can omit its location.

Use [Namma Flutter](communities/namma-flutter.toml) as an example. Optional `logo` paths point to a checked-in image under `web/art/`, such as `art/communities/group.webp`. Only include artwork you have permission to publish.

## Add or correct a Flutter gathering

1. Check for a matching event in [events](events/), including past editions. Keep the same filename for corrections, cancellations and rescheduling so shared links and calendar UIDs keep working.
2. Copy a similar listing, such as the [Singapore meetup](events/flutter-singapore-q4-2026.toml) or [online Athens meetup](events/flutter-athens-online-01.toml). Set `community_id` to the organizer's filename without the extension.
3. Include an official source. An organizer's Meetup event, official Flutter listing, community event page or reviewed integration export can establish the details. Set `url` to the event page. Set `source` separately when a different official page supports the listing.
4. Include a short original description and update `updated_at` to the time the contribution was reviewed. Run `dart run tool/validate.dart` from the repository root. Open a pull request against `main` and link the organizer's source in the description.

| Fields | Format |
| --- | --- |
| `title`, `description`, `community_id`, `url` | Nonempty quoted strings. URLs must be absolute HTTP(S) links. |
| `start`, `end`, `timezone` | A pair of quoted ISO timestamps with explicit UTC offsets, or two local calendar dates. Date-only ends include the whole final day in the named IANA time zone. |
| `category` | Conference, Meetup, Workshop, Hackathon or Gathering |
| `attendance` | In person, Online or Hybrid |
| `city`, `country`, `venue` | Physical and hybrid events require city and country. Use a full country name consistent with the directory. Include a venue when known. |
| `latitude`, `longitude` | Optional pair of TOML numbers. Use the venue or host city's location. Omit these for online events. |
| `source`, `updated_at` | Optional verification URL, defaulting to `url`. Required review timestamp with a UTC offset. |
| `registration_url`, `registration_label`, `registration_ends`, `price` | Optional ticket details. Use an offset timestamp for the registration deadline. Remove a ticket link if the organizer withdraws it. |
| `status` | scheduled (default), cancelled or rescheduled. For a rescheduled event, update the dates in the original file. |
| `artwork`, `artwork_card`, `artwork_thumbnail`, `artwork_credit`, `artwork_source` | Optional local detail, card and thumbnail image paths relative to `web/`, a byline and its source URL. For city photos, identify the location depicted. |

An event without artwork gets a deterministic illustration. When contributing photographs, add any required attribution and license information alongside the assets. The atlas city photographs have a [credit file](web/art/events/CREDITS.txt).

## Import a permitted event export

For a permitted Meetup integration or an official organizer that exports Schema.org Event JSON-LD, save a single event or a graph containing one event to disk. The importer reads the file locally and writes proposed TOML to standard output. It uses the same record validation as the build.

```sh
dart run tool/import_event.dart organizer-event.json flutter-singapore Meetup Asia/Singapore 2026-11-28T00:00:00Z
```

The final argument supplies the date you reviewed the export. It can be omitted when the source includes `dateModified`. The export should include a title, description, start, end, public URL and attendance mode or a typed location. Physical locations need a structured address with city and country. The importer handles virtual meetings, mixed attendance, cancellations, rescheduling and dated ticket offers. Review country spelling, co-organizers, source rights and the organizer's latest registration details, then save the output in a new event file. Keep the source's authentication and personal attendee information out of the repository.

Run `dart run tool/check_import.dart` to exercise the import and catalog fixtures. Run `python3 -m unittest discover -s tool/push -p 'test_*.py'` for notification eligibility checks. Existing public URLs from the predecessor catalog are served from [legacy-events](legacy-events/) and excluded from the atlas and new notifications.
