const projectWordmark = 'flutter';
const projectSuffix = '.spot';
const projectName = '$projectWordmark$projectSuffix';
const projectRepository = String.fromEnvironment('PROJECT_REPOSITORY', defaultValue: 'shiva396/$projectName');

const projectDescription = 'Explore Flutter events and developer communities around the world with Namma Flutter.';
const siteAddress = String.fromEnvironment('SITE_URL', defaultValue: 'https://shiva396.github.io/flutter.spot/');
const nammaWebsite = 'https://nammaflutter.com/';
const contributionGuide = 'https://github.com/$projectRepository/blob/main/CONTRIBUTING.md';
String publicUrl(String path) => Uri.parse(siteAddress.endsWith('/') ? siteAddress : '$siteAddress/').resolve(path).toString();
