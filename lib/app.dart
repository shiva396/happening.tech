import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';
import 'atlas/communities.dart';
import 'atlas/details.dart';
import 'atlas/presentation.dart';
import 'components/icon.dart';
import 'event.dart';
import 'pages/home.dart';
import 'pages/submit.dart';
import 'pages/notifications.dart';
import 'project.dart';

class App extends StatelessComponent {
  final List<Event> events;
  final List<Event> legacy;
  final List<Community> communities;
  const App(this.events,this.communities,this.legacy,{super.key});

  @override
  Component build(BuildContext context) {
    final path=Uri.parse(context.url).path.replaceFirst(RegExp(r'/$'),'');
    final home=path.isEmpty || path=='/world';
    return div([
      a(href:home?'./#program':'.${path}/#content',classes:'skip',[.text('Skip to content')]),
      if(!home)div(classes:'inner-header section-inner',[brand(),homeLink('world','World view','globe')]),
      main_(id:'content',[
        Router(routes:[
          for(final path in ['/','/world'])Route(path:path,builder:(_,_)=>Atlas(events,communities)),
          for(final path in ['/archive','/past'])Route(path:path,builder:(_,_)=>Atlas(events,communities,archive:true)),
          Route(path:'/communities',builder:(_,_)=>Communities(communities,events,directory:true)),
          for(final c in communities) Route(path:'/communities/${c.id}',builder:(_,_)=>CommunityDetails(c,events)),
          for(final e in events) Route(path:'/events/${e.id}',builder:(_,_)=>EventDetails(e)),
          for(final e in legacy) Route(path:'/events/${e.id}',builder:(_,_)=>EventDetails(e,legacy:true)),
          Route(path:'/notifications',builder:(_,_)=>Component.fragment([pageHead('Notifications','notifications/'),const NotificationsPage()])),
          Route(path:'/submit',builder:(_,_)=>Component.fragment([pageHead('List a Flutter event','submit/'),SubmitPage(communities)])),
        ]),
      ]),
      footer(classes:'site-foot section-inner',[
        a(classes:'credit',href:nammaWebsite,[.text('Made with '),span(attributes:{'aria-label':'love'},[.text('♥')]),.text(' by Shiva and Justin from NammaFlutter')]),
        nav(attributes:{'aria-label':'Contribute and follow'},[
          a(href:'submit/',[icon('plus'),.text('List an event')]),
          a(href:'notifications/',[.text('Notifications')]),
          a(href:contributionGuide,[.text('GitHub')]),
        ]),
      ]),
    ]);
  }
}
