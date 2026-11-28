import 'dart:io';

import 'package:toml/toml.dart';

/// Validates a contribution before any of its values reach HTML or an external link.
typedef Fields = Map<String, dynamic>;

List<T> readDirectory<T>(String path, T Function(String id, Fields fields) parse) {
  final files =
      Directory(
          path,
        ).listSync(followLinks: false).whereType<File>().where((file) => file.path.endsWith('.toml')).toList()
        ..sort((a, b) => a.path.compareTo(b.path));
  final result = <T>[];
  for (final file in files) {
    try {
      final id = file.uri.pathSegments.last.replaceFirst(RegExp(r'\.toml$'), '');
      if (!RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(id)) {
        throw const FormatException('Use a lowercase, hyphen-separated filename');
      }
      final fields = TomlDocument.parse(file.readAsStringSync()).toMap();
      result.add(parse(id, fields));
    } on Exception catch (error) {
      throw FormatException('${file.path}: $error');
    }
  }
  return result;
}

void checkKeys(Fields fields, Set<String> required, Set<String> optional) {
  final missing = required.difference(fields.keys.toSet());
  final unknown = fields.keys.toSet().difference({...required, ...optional});
  if (missing.isNotEmpty) throw FormatException('Missing ${missing.join(', ')}');
  if (unknown.isNotEmpty) throw FormatException('Unknown fields ${unknown.join(', ')}');
}

String? fieldText(Fields data, String key) {
  final value = data[key];
  if (value == null) return null;
  if (value is! String || value.trim().isEmpty) {
    throw FormatException('"$key" must be a nonempty quoted string');
  }
  return value.trim();
}

String httpLink(String value) {
  final uri = Uri.tryParse(value);
  if (uri == null ||
      !['https', 'http'].contains(uri.scheme) ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty ||
      RegExp(r'[\s\\]').hasMatch(value)) {
    throw FormatException('Invalid HTTP(S) URL "$value"');
  }
  return value;
}

String? fieldLink(Fields data, String key) {
  final value = fieldText(data, key);
  return value == null ? null : httpLink(value);
}

String? imagePath(Fields data, String key) {
  final value = fieldText(data, key);
  if (value == null) return null;
  if (!RegExp(r'^art/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\.(?:webp|avif|png|jpe?g)$').hasMatch(value) ||
      !File('web/$value').existsSync()) {
    throw FormatException('"$key" must refer to a local image in web/art/');
  }
  return value;
}

(double?, double?) coordinates(Fields data) {
  final lat = data['latitude'];
  final lon = data['longitude'];
  if (lat == null && lon == null) return (null, null);
  if (lat is! num || lon is! num || !lat.isFinite || !lon.isFinite || lat.abs() > 90 || lon.abs() > 180) {
    throw const FormatException('Supply both latitude (−90…90) and longitude (−180…180) as finite numbers');
  }
  return (lat.toDouble(), lon.toDouble());
}
