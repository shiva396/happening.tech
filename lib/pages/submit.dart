import '../event.dart';
import '../project.dart';
import '../components/icon.dart';
import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

class SubmitPage extends StatelessComponent {
  final List<Community> communities;
  const SubmitPage(this.communities, {this.repository = projectRepository, super.key});

  final String repository;

  Component _field(
    String name,
    String title, {
    String? hint,
    InputType type = InputType.text,
    bool optional = false,
    String? list,
    int limit = 160,
    Map<String, String> constraints = const {},
  }) {
    return label([
      span([.text(title)]),
      input(
        name: name,
        type: type,
        attributes: {
          if (!optional) 'required': '',
          if (type == InputType.date) 'max': '9999-12-31',
          'placeholder': ?hint,
          'list': ?list,
          'maxlength': '$limit',
          ...constraints,
        },
      ),
    ]);
  }

  Component _group(String title, List<Component> fields) => fieldset([
    legend([.text(title)]),
    div(classes: 'entry-fields', fields),
  ]);

  @override
  Component build(BuildContext context) {
    return Component.fragment([
      const link(href: 'submit.css', rel: 'stylesheet'),
      section(
        id: 'entry-studio',
        attributes: {'data-repository': repository},
        [
          h1([
            .text('List an event'),
            span(classes: 'entry-period', [.text('.')]),
          ]),
          aside(
            classes: 'entry-review',
            attributes: {'aria-label': 'How listings are published'},
            [
              svg(
                classes: 'icon',
                viewBox: '0 0 24 24',
                attributes: {'aria-hidden': 'true'},
                [
                  Component.element(tag: 'use', attributes: {'href': 'art/icons.svg#pull-request'}),
                ],
              ),
              div([
                strong([.text('Listings go through GitHub review')]),
                p([
                  .text(
                    repository.isEmpty
                        ? 'For this MVP, download your event file here. When the repository opens, submit it in a GitHub pull request. A maintainer reviews and merges accepted listings for publication.'
                        : 'Prepare your event file here, then open a pull request on GitHub. A maintainer reviews and merges accepted listings for publication.',
                  ),
                ]),
              ]),
            ],
          ),
          a(classes: 'entry-jump', href: 'submit/#entry-preview', [.text('See your listing preview')]),
          div(classes: 'entry-layout', [
            form(id: 'entry-form', [
              _group('The gathering', [
                _field('title', 'Event name', hint: 'What’s the gathering called?'),
                label([
                  span([.text('Organizing community')]),
                  select(
                    name: 'community_id',
                    attributes: {'required': ''},
                    [
                      option(value: '', [.text('Choose a community')]),
                      for (final c in communities) option(value: c.id, [.text(c.name)]),
                    ],
                  ),
                ]),
                a(classes: 'text-link', href: '$contributionGuide#add-a-community', [.text('Add a missing community')]),
                div(classes: 'entry-pair', [
                  for (final (key, caption, values) in [
                    ('category', 'Event type', eventCategories),
                    ('attendance', 'Attendance', attendanceFormats),
                  ])
                    label([
                      span([.text(caption)]),
                      select(name: key, [
                        for (final v in values) option(value: v, selected: v == 'Meetup', [.text(v)]),
                      ]),
                    ]),
                ]),
                label([
                  span([.text('About the event')]),
                  textarea(
                    [],
                    name: 'description',
                    required: true,
                    rows: 3,
                    placeholder: 'What will people do, learn, or make together?',
                    attributes: {'maxlength': '700'},
                  ),
                ]),
              ]),
              _group('When & where', [
                div(classes: 'entry-pair', [
                  _field('start_date', 'Start date', type: InputType.date),
                  _field('end_date', 'Last day (if different)', type: InputType.date, optional: true),
                ]),
                _field('timezone', 'Event time zone', hint: 'e.g. Asia/Kolkata', list: 'entry-timezones'),
                datalist(id: 'entry-timezones', []),
                details([
                  summary([.text('Add start and end times')]),
                  div(classes: 'entry-pair', [
                    _field('start_time', 'Start time', type: InputType.time, optional: true),
                    _field('end_time', 'End time', type: InputType.time, optional: true),
                  ]),
                ]),
                div(id: 'entry-place', [
                  div(classes: 'entry-pair', [
                    _field('city', 'City', hint: 'e.g. Chennai'),
                    _field('country', 'Country', hint: 'e.g. India'),
                  ]),
                  _field('venue', 'Venue (optional)', hint: 'Venue name', optional: true),
                  div(classes: 'entry-pair', [
                    for (final (key, caption, bound) in [('latitude', 'Latitude', 90), ('longitude', 'Longitude', 180)])
                      _field(
                        key,
                        '$caption (optional)',
                        type: InputType.number,
                        optional: true,
                        constraints: {'min': '-$bound', 'max': '$bound', 'step': 'any'},
                      ),
                  ]),
                ]),
              ]),
              _group('How to attend', [
                _field('url', 'Official event page', type: InputType.url, hint: 'https://', limit: 1000),
                _field(
                  'registration_url',
                  'Registration link (optional)',
                  type: InputType.url,
                  hint: 'Direct link to tickets, RSVP, or waitlist',
                  optional: true,
                  limit: 1000,
                ),
                div(
                  id: 'entry-registration',
                  attributes: {'hidden': ''},
                  [
                    label([
                      span([.text('Registration button')]),
                      select(name: 'registration_label', [
                        for (final value in ['Register with host', 'Get tickets', 'Join waitlist', 'Request to attend'])
                          option([.text(value)]),
                      ]),
                    ]),
                  ],
                ),
                _field('price', 'Price (optional)', hint: 'e.g. Free or ₹500', optional: true),
              ]),
              button(id: 'entry-submit', type: ButtonType.submit, disabled: true, [.text('Prepare listing')]),
              p(id: 'entry-note', [
                .text('Enable JavaScript to prepare a file here, or use the '),
                a(href: contributionGuide, [.text('contribution guide')]),
                .text('.'),
              ]),
              div(
                id: 'entry-output',
                attributes: {'hidden': ''},
                [
                  h2([icon('check'), .text('Your listing is ready.')]),
                  p(id: 'entry-outcome', attributes: {'role': 'status'}, []),
                  div(classes: 'entry-actions', [
                    a(id: 'entry-github', href: '#', attributes: {'hidden': ''}, [.text('Propose on GitHub')]),
                    a(id: 'entry-download', href: '#', [.text('Download event file')]),
                  ]),
                ],
              ),
            ]),
            aside(
              id: 'entry-preview',
              classes: 'entry-preview',
              attributes: {'aria-label': 'Live listing preview'},
              [
                h2([.text('Listing preview')]),
                div(id: 'entry-poster', classes: 'poster', [
                  img(src: 'art/atlas-print-0.svg', id: 'entry-art', alt: ''),
                  div(classes: 'poster-top', [
                    span(id: 'entry-format', [.text('Meetup')]),
                    span(id: 'entry-year', []),
                  ]),
                  div(classes: 'poster-title', id: 'entry-preview-title', [.text('Your event')]),
                  div(classes: 'poster-foot', [
                    span(id: 'entry-preview-place', [.text('Your city')]),
                    span(id: 'entry-preview-date', [.text('Event date')]),
                  ]),
                ]),
                p(id: 'entry-preview-host', [.text('Your community')]),
                p(id: 'entry-preview-description', [.text('Your description will appear here.')]),
                a(classes: 'entry-jump', href: 'submit/#entry-form', [.text('Back to event details')]),
              ],
            ),
          ]),
        ],
      ),
      const script(src: 'submit.js', defer: true),
    ]);
  }
}
