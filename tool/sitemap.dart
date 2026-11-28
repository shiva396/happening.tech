import 'dart:io';
import 'package:flutter_spot/event.dart';
import 'package:flutter_spot/project.dart';

void main(List<String> args) {
  final site = Uri.parse(args.isEmpty ? siteAddress : args.single);
  final root = Uri.parse(site.toString().replaceFirst(RegExp(r'/?$'), '/'));
  final paths=['', 'archive/', 'communities/', 'submit/', 'notifications/',
    for(final e in loadEvents()) 'events/${e.id}/', for(final c in loadCommunities()) 'communities/${c.id}/'];
  File('build/jaspr/sitemap.xml').writeAsStringSync('<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    '${paths.map((path)=>'  <url><loc>${root.resolve(path)}</loc></url>').join('\n')}\n</urlset>\n');
  File('build/jaspr/robots.txt').writeAsStringSync('User-agent: *\nAllow: /\nSitemap: ${root.resolve('sitemap.xml')}\n');
}
