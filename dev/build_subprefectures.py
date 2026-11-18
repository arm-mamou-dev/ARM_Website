"""Builds one page per sub-prefecture of Mamou into mamou/<slug>.html.

Run after changing the data below or the header/footer in about.html:
    python3 dev/build_subprefectures.py

Population: 3rd General Census of Population and Housing (RGPH-3, 2014),
Institut National de la Statistique de Guinée (INS).
"""
import os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "mamou")

# (name, population 2014, is urban commune)
PLACES = [
    ("Mamou-Centre", 83008, True),
    ("Bouliwel", 20881, False),
    ("Dounet", 30534, False),
    ("Gongoret", 8731, False),
    ("Kégnéko", 19134, False),
    ("Konkouré", 13039, False),
    ("N'yagara", 12319, False),
    ("Ouré-Kaba", 31804, False),
    ("Porédaka", 22153, False),
    ("Saramoussaya", 23216, False),
    ("Soyah", 22782, False),
    ("Téguéréya", 9298, False),
    ("Timbo", 13364, False),
    ("Tolo", 8718, False),
]
TOTAL = sum(p[1] for p in PLACES)

# Map coordinates (lat, lon) from OpenStreetMap (Nominatim)
COORDS = {
    "Mamou-Centre": (10.3741, -12.0836), "Bouliwel": (10.6102, -12.1893), "Dounet": (10.5134, -11.9187),
    "Gongoret": (10.7712, -11.9520), "Kégnéko": (10.5411, -11.7809), "Konkouré": (10.3110, -12.2363),
    "N'yagara": (10.7609, -11.7936), "Ouré-Kaba": (10.1371, -11.6615), "Porédaka": (10.7325, -12.0676),
    "Saramoussaya": (10.6796, -11.6299), "Soyah": (10.2878, -11.9725), "Téguéréya": (11.0516, -11.6174),
    "Timbo": (10.6343, -11.8284), "Tolo": (10.5402, -12.1462),
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
    name, pop, urban = PLACES[i]
    s = slug(name)
    share = pop / TOTAL * 100
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

    kind_en = "Urban commune of Mamou prefecture, Guinea" if urban else "Sub-prefecture of Mamou prefecture, Guinea"
    kind_key = "sp.kindUrban" if urban else "sp.kind"

    others = "\n".join(
        "            <li" + (' class="is-current"' if j == i else "") + ">"
        + (f'<span aria-current="page">{esc(n)}</span>' if j == i else f'<a href="{slug(n)}.html">{esc(n)}</a>')
        + "</li>"
        for j, (n, _, _) in enumerate(PLACES)
    )

    title = f"{name} – ARM Mamou"
    desc = f"{name}: {'urban commune' if urban else 'sub-prefecture'} of Mamou, Guinea. Population {pop:,} (2014 census)."
    h = head.replace("<title>About – ARM Mamou</title>", f"<title>{esc(title)}</title>")
    h = h.replace('data-page="about"', f'data-page="federation" data-sp="{esc(name)}"')
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(desc)}">', h)

    body = f'''
    <section class="page-head">
      <div class="container">
        <p class="crumbs"><a href="../federation.html" data-i18n="nav.federation">Federation</a> › {esc(name)}</p>
        <h1>{esc(name)}</h1>
        <p class="intro" data-i18n="{kind_key}">{kind_en}</p>
      </div>
    </section>
    <section class="page-body">
      <div class="container sp-layout">
        <div>
          <div class="sp-fed">
            <strong data-i18n="sp.fedMember">Member of the ARM federation</strong>
            <span><span data-i18n="sp.fedCount">ARM members from this community:</span> <span id="spMembers" class="sp-members">–</span></span>
          </div>
{site_html}
          <dl class="sp-facts">
            <div><dt data-i18n="sp.pop">Population (2014 census)</dt><dd><span class="num" data-n="{pop}">{pop:,}</span></dd></div>
            <div><dt data-i18n="sp.share">Share of the prefecture</dt><dd><span class="num" data-n="{share:.1f}" data-pct>{share:.1f}%</span></dd></div>
            <div><dt data-i18n="sp.prefecture">Prefecture</dt><dd>Mamou</dd></div>
            <div><dt data-i18n="sp.country">Country</dt><dd data-i18n="sp.guinea">Guinea</dd></div>
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
          <p class="sp-source"><a href="{map_link}" target="_blank" rel="noopener" data-i18n="sp.bigMap">View larger map</a> · <span data-i18n="sp.source">Population: 2014 General Census (RGPH-3), Institut National de la Statistique de Guinée.</span></p>
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
          <ul class="subpref-list">
{others}
          </ul>
        </nav>
      </div>
    </section>
'''
    return s, h + body + foot


def about_grid():
    """Rewrites the sub-prefecture list on federation.html so each item links to its page (and website)."""
    path = os.path.join(ROOT, "federation.html")
    html = open(path, encoding="utf-8").read()
    items = []
    for name, _, urban in PLACES:
        label = '<span data-i18n="about.urban">Mamou (urban commune)</span>' if urban else esc(name)
        site = WEBSITES.get(name)
        extra = f'<a class="sp-ext" href="{site}" target="_blank" rel="noopener">{domain(site)} ↗</a>' if site else ""
        count = f'<span class="sp-count" data-sp="{esc(name)}"></span>'
        items.append("            <li" + (' class="is-center"' if urban else "") + f'><a href="mamou/{slug(name)}.html">{label}</a>{count}{extra}</li>')
    new = '<ul class="subpref-list">\n' + "\n".join(items) + "\n          </ul>"
    html = re.sub(r'<ul class="subpref-list">.*?</ul>', new, html, count=1, flags=re.S)
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
    print(f"{len(PLACES)} pages, total population {TOTAL:,}")


if __name__ == "__main__":
    main()
