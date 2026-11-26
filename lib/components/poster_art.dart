import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

const _places = {'ahmedabad', 'kochi', 'london', 'brussels', 'barcelona', 'long-beach', 'amsterdam', 'online'};

Component posterArt({String city = '', bool preview = false}) {
  final place = city.trim().toLowerCase().replaceAll(' ', '-');
  final design = _places.contains(place) ? place : 'gathering';
  return img(
    src: 'art/posters/$design.webp',
    alt: '',
    classes: 'poster-art',
    id: preview ? 'entry-art' : null,
    attributes: {if (preview) 'data-places': _places.join(' ')},
  );
}
