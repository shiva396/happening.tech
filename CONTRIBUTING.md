# Contribute to flutter.spot

## List or correct an event

1. Check the programme and archive for an existing listing. Update its file for corrections so shared links keep working.
2. Use **List an event** on the site to prepare a TOML file, or copy a similar file from the [events directory](events/). Use one file per event with a lowercase, hyphenated filename.
3. Include the organizer, topic, format, location, venue, and an official event link. Use the host’s IANA time zone. Include a UTC offset for timed events, or use calendar dates for all-day events. Add a registration link and price when the organizer provides them.
4. Run `dart run tool/validate.dart` if you are working locally. Open a pull request against `main` and include the organizer’s source so a maintainer can check the listing. Approved changes go live after merge and deployment.

## Change the site

Describe what you changed and how you tested it. Include a screenshot for a visual change. Report bugs with the page URL, browser, and steps to reproduce.
