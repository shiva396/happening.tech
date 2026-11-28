import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../project.dart';

class NotificationsPage extends StatelessComponent {
  const NotificationsPage({super.key});

  @override
  Component build(BuildContext context) {
    const publicKey = String.fromEnvironment('VAPID_PUBLIC_KEY');
    const endpoint = String.fromEnvironment('PUSH_SUBSCRIPTION_URL');
    const enabled = publicKey != '' && endpoint != '';
    return div(classes: 'wrap', [
      header(classes: 'opening', [
        h1([.text('Notifications')]),
      ]),
      section(
        classes: 'notice-settings',
        attributes: {'aria-label': 'Event alerts'},
        [
          h2([.text('New event alerts')]),
          p([.text('Get an alert on this device when a Flutter event is listed.')]),
          p(
            id: 'push-status',
            attributes: {'role': 'status'},
            [
              .text(!enabled ? 'Browser alerts are not enabled on this site yet.' : 'Checking browser support…'),
            ],
          ),
          if (enabled) ...[
            button(
              id: 'push-toggle',
              classes: 'list-event',
              attributes: {'type': 'button', 'hidden': '', 'data-public-key': publicKey, 'data-endpoint': endpoint},
              [
                .text('Enable notifications'),
              ],
            ),
            script(src: 'notifications.js', attributes: {'type': 'module'}),
          ],
          p([
            a(href: 'https://github.com/$projectRepository/commits/main/events.atom', [
              .text('Follow listing changes in your feed reader'),
            ]),
          ]),
        ],
      ),
    ]);
  }
}
