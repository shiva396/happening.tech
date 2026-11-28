import 'dart:convert';
import 'dart:io';

import 'package:flutter_spot/event.dart';
import 'package:toml/toml.dart';

String? _type(dynamic value) => value is String ? value.split('/').last : null;

Map<String, dynamic> _event(dynamic export) {
  final List<dynamic> nodes = export is List
      ? export
      : export is Map && export['@graph'] is List
      ? export['@graph'] as List
      : [export];
  final events = nodes.whereType<Map<String, dynamic>>().where((node) {
    final types = node['@type'] is List ? node['@type'] as List : [node['@type']];
    return types.any((type) => (_type(type) ?? '').endsWith('Event'));
  }).toList();
  if (events.length != 1) throw const FormatException('Supply an export containing exactly one Event');
  return events.single;
}

Map<String, dynamic> importFields(
  dynamic export,
  String communityId,
  String category,
  String timezone,
  String? reviewedAt,
) {
  final event = _event(export);
  final locations = (event['location'] is List ? event['location'] as List : [event['location']])
      .whereType<Map<String, dynamic>>()
      .toList();
  final virtual = locations.any((location) => _type(location['@type']) == 'VirtualLocation');
  final place = locations.where((location) => _type(location['@type']) == 'Place').firstOrNull;
  final attendance = switch (_type(event['eventAttendanceMode'])) {
    'MixedEventAttendanceMode' => 'Hybrid',
    'OnlineEventAttendanceMode' => 'Online',
    'OfflineEventAttendanceMode' => 'In person',
    null when virtual && place != null => 'Hybrid',
    null when virtual => 'Online',
    null when place != null => 'In person',
    _ => throw const FormatException('Include an attendance mode or a Place / VirtualLocation'),
  };
  final address = place?['address'];
  final geo = place?['geo'];
  final mapAddress = address is Map ? address : const {};
  final country = mapAddress['addressCountry'];
  final status = switch (_type(event['eventStatus'])) {
    'EventScheduled' || 'EventMovedOnline' || null => 'scheduled',
    'EventCancelled' => 'cancelled',
    'EventRescheduled' => 'rescheduled',
    _ => throw const FormatException('Review the unsupported eventStatus before contributing'),
  };
  final offers = (event['offers'] is List ? event['offers'] as List : [event['offers']]).whereType<Map>();
  final offer = offers
      .where(
        (offer) =>
            offer['url'] is String &&
            [null, 'InStock', 'LimitedAvailability', 'PreSale'].contains(_type(offer['availability'])),
      )
      .firstOrNull;
  final fields = <String, dynamic>{
    'title': event['name'],
    'description': event['description'],
    'start': event['startDate'],
    'end': event['endDate'],
    'timezone': timezone,
    'category': category,
    'attendance': attendance,
    'status': status,
    'community_id': communityId,
    'url': event['url'],
    'updated_at': reviewedAt ?? event['dateModified'],
    if (attendance != 'Online') ...{
      'city': mapAddress['addressLocality'],
      'country': country is Map ? country['name'] : country,
      'venue': place?['name'],
      if (geo is Map) ...{
        'latitude': num.tryParse(geo['latitude'].toString()),
        'longitude': num.tryParse(geo['longitude'].toString()),
      },
    },
    if (offer != null && status != 'cancelled') ...{
      'registration_url': offer['url'],
      'registration_ends': offer['validThrough'],
    },
  };
  fields.removeWhere((_, value) => value == null);
  return fields;
}

void main(List<String> args) {
  if (args.length < 4 || args.length > 5) {
    stderr.writeln(
      'Usage: dart run tool/import_event.dart FILE.json COMMUNITY_ID CATEGORY IANA_TIMEZONE [REVIEWED_AT]',
    );
    exitCode = 64;
    return;
  }
  try {
    final export = jsonDecode(File(args[0]).readAsStringSync());
    final fields = importFields(export, args[1], args[2], args[3], args.elementAtOrNull(4));
    validateContribution(fields, loadCommunities());
    stdout.write(TomlDocument.fromMap(fields));
  } on Exception catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  }
}
