"""Builds one page per sub-prefecture of Mamou into mamou/<slug>.html.

Run after changing the data below or the header/footer in about.html:
    python3 dev/build_subprefectures.py

Population: 3rd General Census of Population and Housing (RGPH-3, 2014),
Institut National de la Statistique de Guinée (INS).
"""
import os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "mamou")

# All 36 sub-prefectures of the Mamou region (same list as the DataSheet's "Region of Mamou" tab).
# (name, prefecture, population 2014 or None, is urban commune)
# Mamou/Timbo split is provisional until the official Timbo list is published.
# Dalaba and Pita: no 2014 census figure per sub-prefecture was found, so none is shown.
PLACES = [
    ("Mamou-Centre", "Mamou", 83008, True),
    ("Bouliwel", "Mamou", 20881, False),
    ("Gongoret", "Mamou", 8731, False),
    ("Konkouré", "Mamou", 13039, False),
    ("Ouré-Kaba", "Mamou", 31804, False),
    ("Soyah", "Mamou", 22782, False),
    ("Tolo", "Mamou", 8718, False),
    ("Timbo", "Timbo", 13364, False),
    ("Dounet", "Timbo", 30534, False),
    ("Kégnéko", "Timbo", 19134, False),
    ("N'yagara", "Timbo", 12319, False),
    ("Porédaka", "Timbo", 22153, False),
    ("Saramoussaya", "Timbo", 23216, False),
    ("Téguéréya", "Timbo", 9298, False),
    ("Dalaba-Centre", "Dalaba", None, True),
    ("Bodié", "Dalaba", None, False),
    ("Ditinn", "Dalaba", None, False),
    ("Kaala", "Dalaba", None, False),
    ("Kankalabé", "Dalaba", None, False),
    ("Kébali", "Dalaba", None, False),
    ("Koba", "Dalaba", None, False),
    ("Mafara", "Dalaba", None, False),
    ("Mitty", "Dalaba", None, False),
    ("Mombeya", "Dalaba", None, False),
    ("Pita-Centre", "Pita", None, True),
    ("Bantignel", "Pita", None, False),
    ("Brouwal Tappé", "Pita", None, False),
    ("Donghol Touma", "Pita", None, False),
    ("Gongoré", "Pita", None, False),
    ("Ley Miro", "Pita", None, False),
    ("Maci", "Pita", None, False),
    ("Ninguélandé", "Pita", None, False),
    ("Sangaréah", "Pita", None, False),
    ("Sintaly", "Pita", None, False),
    ("Timbi Madina", "Pita", None, False),
    ("Timbi Tounni", "Pita", None, False),
]
PREFS = ["Mamou", "Timbo", "Dalaba", "Pita"]
PARTNERS = {"Dalaba", "Pita"}       # have their own associations in the USA: allies, not ARM members
PROVISIONAL = {"Mamou", "Timbo"}    # split not official yet
PREF_TOTAL = {p: sum(x[2] for x in PLACES if x[1] == p) for p in PREFS if all(x[2] for x in PLACES if x[1] == p)}
TOTAL = sum(x[2] or 0 for x in PLACES)

# Map coordinates (lat, lon): Mamou/Timbo from OpenStreetMap (Nominatim), Dalaba/Pita from fr.wikipedia infoboxes
COORDS = {
    "Mamou-Centre": (10.3741, -12.0836), "Bouliwel": (10.6102, -12.1893), "Dounet": (10.5134, -11.9187),
    "Gongoret": (10.7712, -11.9520), "Kégnéko": (10.5411, -11.7809), "Konkouré": (10.3110, -12.2363),
    "N'yagara": (10.7609, -11.7936), "Ouré-Kaba": (10.1371, -11.6615), "Porédaka": (10.7325, -12.0676),
    "Saramoussaya": (10.6796, -11.6299), "Soyah": (10.2878, -11.9725), "Téguéréya": (11.0516, -11.6174),
    "Timbo": (10.6343, -11.8284), "Tolo": (10.5402, -12.1462),
    "Dalaba-Centre": (10.6917, -12.2500), "Bodié": (11.0333, -12.0667), "Ditinn": (10.8833, -12.1833),
    "Kaala": (10.8167, -12.1667), "Kankalabé": (11.1500, -12.0000), "Kébali": (10.9500, -12.2000),
    "Koba": (10.6167, -12.3167), "Mafara": (10.8333, -12.2667), "Mitty": (10.8333, -12.3167),
    "Mombeya": (11.2167, -12.0667),
    "Pita-Centre": (11.0596, -12.3956), "Bantignel": (11.1167, -12.3000), "Brouwal Tappé": (11.0000, -12.3833),
    "Donghol Touma": (11.8390, -12.5508), "Gongoré": (10.8333, -12.4167), "Ley Miro": (10.9333, -12.8833),
    "Maci": (10.9167, -12.4333), "Ninguélandé": (11.1833, -12.6667), "Sangaréah": (10.6333, -12.8500),
    "Sintaly": (11.1000, -12.4333), "Timbi Madina": (11.2000, -12.5333), "Timbi Tounni": (11.1167, -12.4833),
}

# Websites of each sub-prefecture's association (add more as they are confirmed)
WEBSITES = {
    "Dounet": "https://dounet.org",
    "Tolo": "https://adtusa.org",
}


def domain(url):
    return re.sub(r"^https?://(www\.)?", "", url).rstrip("/")


def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("'", "")).strip("-")


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def shell():
    """Header and footer from about.html, with links rewritten for the mamou/ folder."""
    src = open(os.path.join(ROOT, "about.html"), encoding="utf-8").read()
    # (federation.html shares the same header and footer)
    head = src[: src.index('  <main id="main">') + len('  <main id="main">\n')]
    foot = src[src.index("  </main>"):]

    def fix(html):
        html = re.sub(r'(href|src)="(?!https?:|#|data:|mailto:|\.\./)([^"]+)"', r'\1="../\2"', html)
        return html
    return fix(head), fix(foot)


def page(i, head, foot):
    name, pref, pop, urban = PLACES[i]
    s = slug(name)
    share = pop / PREF_TOTAL[pref] * 100 if pop and pref in PREF_TOTAL else None
    prev_p, next_p = PLACES[i - 1], PLACES[(i + 1) % len(PLACES)]
    lat, lon = COORDS[name]
    d = 0.04 if urban else 0.08
    bbox = f"{lon - d * 1.5:.4f}%2C{lat - d:.4f}%2C{lon + d * 1.5:.4f}%2C{lat + d:.4f}"
    map_src = f"https://www.openstreetmap.org/export/embed.html?bbox={bbox}&amp;layer=mapnik&amp;marker={lat}%2C{lon}"
    map_link = f"https://www.openstreetmap.org/?mlat={lat}&amp;mlon={lon}#map={13 if urban else 12}/{lat}/{lon}"

    site = WEBSITES.get(name)
    site_html = f'''
          <div class="sp-site">
            <span data-i18n="sp.site">Association website</span>
            <a href="{site}" target="_blank" rel="noopener" class="btn btn-sm">{domain(site)} ↗</a>
          </div>''' if site else ""

    kind_en = f"{'Urban commune' if urban else 'Sub-prefecture'} of {pref} prefecture, Mamou region, Guinea"
    kind_key = f"sp.{'kindUrban' if urban else 'kind'}.{pref}"
    if pref in PARTNERS:
        fed_html = f'''<div class="sp-fed sp-partner">
            <strong data-i18n="sp.partner.{pref}">Partner prefecture: {pref} has its own association in the USA</strong>
            <span><span data-i18n="sp.fedCount">ARM members from this community:</span> <span id="spMembers" class="sp-members">–</span></span>
          </div>'''
    else:
        fed_html = '''<div class="sp-fed">
            <strong data-i18n="sp.fedMember">Member of the ARM federation</strong>
            <span><span data-i18n="sp.fedCount">ARM members from this community:</span> <span id="spMembers" class="sp-members">–</span></span>
          </div>'''
    prov = '\n          <p class="sp-note" data-i18n="sp.provisional">The split of sub-prefectures between Mamou and Timbo is provisional until the official list is published.</p>' if pref in PROVISIONAL else ""
    facts = ""
    if pop:
        facts += f'\n            <div><dt data-i18n="sp.pop">Population (2014 census)</dt><dd><span class="num" data-n="{pop}">{pop:,}</span></dd></div>'
    if share is not None:
        facts += f'\n            <div><dt data-i18n="sp.share">Share of the prefecture</dt><dd><span class="num" data-n="{share:.1f}" data-pct>{share:.1f}%</span></dd></div>'
    facts += f'\n            <div><dt data-i18n="sp.prefecture">Prefecture</dt><dd>{pref}</dd></div>'
    facts += '\n            <div><dt data-i18n="sp.country">Country</dt><dd data-i18n="sp.guinea">Guinea</dd></div>'
    source = '<span data-i18n="sp.source">Population: 2014 General Census (RGPH-3), Institut National de la Statistique de Guinée.</span>' if pop else '<span data-i18n="sp.noPop">Population by sub-prefecture from the 2014 census is not yet available for this prefecture.</span>'

    groups = []
    for p in PREFS:
        lis = "\n".join(
            "              <li" + (' class="is-current"' if n == name else "") + ">"
            + (f'<span aria-current="page">{esc(n)}</span>' if n == name else f'<a href="{slug(n)}.html">{esc(n)}</a>')
            + "</li>"
            for n, pp, _, _ in PLACES if pp == p)
        groups.append(f'            <div class="sp-group">\n              <h3 class="sp-group-title"><span data-i18n="sp.prefOf">Prefecture of</span> {p}</h3>\n              <ul class="subpref-list">\n{lis}\n              </ul>\n            </div>')
    others = "\n".join(groups)

    title = f"{name} – ARM Mamou"
    desc = f"{name}: {'urban commune' if urban else 'sub-prefecture'} of {pref} prefecture, Mamou region, Guinea." + (f" Population {pop:,} (2014 census)." if pop else "")
    h = head.replace("<title>About – ARM Mamou</title>", f"<title>{esc(title)}</title>")
    h = h.replace('data-page="about"', f'data-page="federation" data-sp="{esc(name)}"')
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(desc)}">', h)

    body = f'''
    <section class="page-head">
      <div class="container">
        <p class="crumbs"><a href="../federation.html" data-i18n="nav.federation">Federation</a> › <a href="../federation.html#pref-{pref.lower()}">{pref}</a> › {esc(name)}</p>
        <h1>{esc(name)}</h1>
        <p class="intro" data-i18n="{kind_key}">{kind_en}</p>
      </div>
    </section>
    <section class="page-body">
      <div class="container sp-layout">
        <div>
          {fed_html}{prov}
{site_html}
          <dl class="sp-facts">{facts}
          </dl>

          <div class="sp-share">
            <label for="pageLink" data-i18n="sp.link">Link to this page</label>
            <div class="copy-row">
              <input id="pageLink" type="text" readonly>
              <button type="button" class="btn btn-outline btn-sm" id="copyLink" data-i18n="sp.copy">Copy link</button>
            </div>
          </div>

          <div class="sp-join">
            <h2 class="h-sm" data-i18n="sp.joinTitle">Join ARM</h2>
            <p data-i18n="sp.joinText">Register once with ARM and you are counted as a member of your sub-prefecture. Registration is free and takes less than a minute.</p>
            <a href="../register.html?sp={s}" class="btn" data-i18n="home.register">Register as a member</a>
          </div>
        </div>

        <div class="sp-map">
          <iframe title="Map of {esc(name)}" loading="lazy" src="{map_src}"></iframe>
          <p class="sp-source"><a href="{map_link}" target="_blank" rel="noopener" data-i18n="sp.bigMap">View larger map</a> · {source}</p>
        </div>
      </div>

      <div class="container">
        <nav class="sp-others" aria-label="Sub-prefectures">
          <div class="sp-others-head">
            <h2 class="h-sm" data-i18n="sp.others">All sub-prefectures in the federation</h2>
            <p class="sp-pager">
              <a href="{slug(prev_p[0])}.html">‹ {esc(prev_p[0])}</a>
              <a href="{slug(next_p[0])}.html">{esc(next_p[0])} ›</a>
            </p>
          </div>
          <div class="sp-groups">
{others}
          </div>
        </nav>
      </div>
    </section>
'''
    return s, h + body + foot


def about_grid():
    """Rewrites the sub-prefecture list on federation.html, grouped by prefecture."""
    path = os.path.join(ROOT, "federation.html")
    html = open(path, encoding="utf-8").read()
    blocks = []
    for p in PREFS:
        items = []
        for name, pp, _, urban in PLACES:
            if pp != p:
                continue
            label = f'<span data-i18n="about.urban.{p}">{p} (urban commune)</span>' if urban else esc(name)
            site = WEBSITES.get(name)
            extra = f'<a class="sp-ext" href="{site}" target="_blank" rel="noopener">{domain(site)} ↗</a>' if site else ""
            count = f'<span class="sp-count" data-sp="{esc(name)}"></span>'
            items.append("              <li" + (' class="is-center"' if urban else "") + f'><a href="mamou/{slug(name)}.html">{label}</a>{count}{extra}</li>')
        n = sum(1 for x in PLACES if x[1] == p)
        tag = (f'<span class="pref-tag partner" data-i18n="fed.partner">Partner: own association in the USA</span>' if p in PARTNERS
               else f'<span class="pref-tag" data-i18n="fed.provisional">List provisional</span>' if p in PROVISIONAL else "")
        blocks.append(f'''          <section class="pref-block" id="pref-{p.lower()}">
            <div class="pref-head"><h3><span data-i18n="sp.prefOf">Prefecture of</span> {p}</h3><span class="pref-n">{n} <span data-i18n="fed.subprefs">sub-prefectures</span></span>{tag}</div>
            <ul class="subpref-list">
{chr(10).join(items)}
            </ul>
          </section>''')
    new = "<!-- SP-LIST (built by dev/build_subprefectures.py) -->\n" + "\n".join(blocks) + "\n          <!-- /SP-LIST -->"
    if "<!-- SP-LIST" in html:
        html = re.sub(r"<!-- SP-LIST.*?<!-- /SP-LIST -->", lambda m: new, html, count=1, flags=re.S)
    else:
        html = re.sub(r'<ul class="subpref-list">.*?</ul>', lambda m: new, html, count=1, flags=re.S)
    open(path, "w", encoding="utf-8").write(html)


def main():
    about_grid()
    os.makedirs(OUT, exist_ok=True)
    head, foot = shell()
    for i in range(len(PLACES)):
        s, html = page(i, head, foot)
        with open(os.path.join(OUT, s + ".html"), "w", encoding="utf-8") as f:
            f.write(html)
        print(f"mamou/{s}.html")
    print(f"{len(PLACES)} pages")


if __name__ == "__main__":
    main()
