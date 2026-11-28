import 'catalog_toml.dart';

class Community {
  final String id, name, city, country, description, url;
  final String? logo;
  final double? latitude, longitude;
  final List<String> links;

  const Community._(
    this.id,
    this.name,
    this.city,
    this.country,
    this.description,
    this.url,
    this.logo,
    this.latitude,
    this.longitude,
    this.links,
  );
}

List<Community> loadCommunities({String directory = 'communities'}) {
  final urls = <String>{};
  return readDirectory(directory, (id, fields) {
    checkKeys(fields, {'name', 'url'}, {'city', 'country', 'description', 'logo', 'latitude', 'longitude', 'links'});
    final url = fieldLink(fields, 'url')!;
    if (!urls.add(Uri.parse(url).removeFragment().toString().replaceFirst(RegExp(r'/+$'), ''))) {
      throw const FormatException('The same official URL appears in another community record');
    }
    final rawLinks = fields['links'] ?? const <String>[];
    if (rawLinks is! List || rawLinks.any((link) => link is! String)) {
      throw const FormatException('links must be an array of URLs');
    }
    final (lat, lon) = coordinates(fields);
    return Community._(
      id,
      fieldText(fields, 'name')!,
      fieldText(fields, 'city') ?? '',
      fieldText(fields, 'country') ?? '',
      fieldText(fields, 'description') ?? '',
      url,
      imagePath(fields, 'logo'),
      lat,
      lon,
      List.unmodifiable(rawLinks.cast<String>().map(httpLink)),
    );
  })..sort((a, b) => a.name.compareTo(b.name));
}
