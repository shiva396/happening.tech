"""Check the actual Pages output, including links, metadata, and downloaded calendar text."""
from base64 import b64decode
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from xml.etree import ElementTree as ET


class Tags(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.items = []
        self.script = None
        self.json = {}
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.items.append((tag, attrs))
        if tag == "script":
            self.script = attrs.get("type")

    def handle_endtag(self, tag):
        if tag == "script":
            self.script = None

    def handle_data(self, data):
        if self.script in {"application/ld+json", "application/json"}:
            self.json[self.script] = json.loads(data)

    def find(self, tag, **attrs):
        return [a for t, a in self.items if t == tag and attrs.items() <= a.items()]


root = Path("build/jaspr")
pages = {p.relative_to(root).as_posix().removesuffix("index.html"): Tags(p.read_text())
         for p in root.rglob("index.html") if "packages" not in p.relative_to(root).parts}
assert not (root / "dash").exists()
assert not any((root / "art").glob("dash.*"))
assert all(not ({"data-dash", "data-perch"} & attrs.keys())
           for page in pages.values() for _, attrs in page.items)
assert {p.name for p in (root / "art/world-detail").glob("*.webp")} == {f"{i}.webp" for i in range(16 * 8 + 32 * 16)}
site = pages[""].find("link", rel="canonical")[0]["href"]
base = urlsplit(site).path
ids = {path: {a["id"] for _, a in page.items if "id" in a} for path, page in pages.items()}
sitemap = {loc.text for loc in ET.parse(root / "sitemap.xml").iterfind(".//{*}loc")}
icons = {el.get("id") for el in ET.parse(root / "art/icons.svg").iter() if el.get("id")}
assert (root / "robots.txt").read_text().endswith("Sitemap: " + site + "sitemap.xml\n")
for path, page in pages.items():
    assert page.find("base")[0]["href"] == base, path
    canonical = page.find("link", rel="canonical")[0]["href"]
    assert canonical == site + {"world/": "", "past/": "archive/"}.get(path, path), path
    assert page.find("meta", property="og:url")[0]["content"] == canonical, path
    assert page.find("meta", name="description")[0]["content"], path
    assert len(page.find("h1")) == 1, path
    for tag, attrs in page.items:
        value = attrs.get("src") or attrs.get("href")
        if not value or value.startswith("data:") or value == "#":
            continue
        dest = urlsplit(urljoin(site, value))
        if dest.netloc != urlsplit(site).netloc:
            continue
        assert dest.path.startswith(base), (path, value)
        target = unquote(dest.path[len(base):])
        assert (root / target).exists(), (path, value)
        if dest.fragment and (target in pages or tag == "use"):
            assert dest.fragment in (icons if tag == "use" else ids[target]), (path, value)
    if path.startswith("events/"):
        schema = page.json["application/ld+json"]
        assert schema["@type"] == "Event" and schema["name"] and schema["location"]
        assert schema["url"].startswith("https://") and schema["startDate"]
        link = next(a["href"] for a in page.find("a") if "download" in a)
        header, payload = link.split(",", 1)
        ics = b64decode(payload).decode() if ";base64" in header else unquote(payload)
        assert "UID:" + path.split("/")[1] + "@flutter.spot\r\n" in ics, path

catalog = pages[""].json["application/json"]
listed = {"", "archive/", "submit/", "notifications/", "communities/"}
for kind in ["events", "communities"]:
    listed.update(f"{kind}/{entry['id']}/" for entry in catalog[kind])
assert sitemap == {site + path for path in listed}
assert all(path in pages for path in listed)
print(f"Checked {len(pages)} static pages, {len(sitemap)} sitemap entries, internal links, SVG symbols and calendar identities.")
