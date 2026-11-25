"""Local test server: serves the website AND mimics the Google Apps Script backend at /mock-api.

Run:  python3 dev/mock_server.py   then open http://localhost:8080
Rows are written to dev/members.csv instead of Google Sheets.
Edit the Status column in that CSV (Pending / Active / Inactive) to test the member status page.
Projects come from dev/projects.json (stands in for the Projects / Project Phases tabs).
Admin page: "Sign in as test admin" (or admin / local-test-only-2026) works only here; imported transactions go to dev/transactions.json.
Try importing dev/sample_chase_checking.csv (made-up data).
Texts tab: nothing is really sent; each text is printed here and the send is logged to dev/texts.json.
A test text to 555-000-0000 fails as "unsubscribed" (like a member who replied STOP).
"""
import csv, hashlib, io, json, os, re
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# ARM_DATA_DIR lets a second test server keep its own data (default: dev/)
DATA_DIR = os.environ.get("ARM_DATA_DIR", os.path.join(ROOT, "dev"))
CSV = os.path.join(DATA_DIR, "members.csv")
HEADERS = ["Member ID", "Registered At", "First Name", "Last Name", "Phone", "Group", "Sub-prefecture", "State of Residence", "Status", "Texts"]
GROUPS = ["Male", "Female"]
SUBPREFS = ["Mamou-Centre", "Bouliwel", "Dounet", "Gongoret", "Kégnéko", "Konkouré", "N'yagara",
            "Ouré-Kaba", "Porédaka", "Saramoussaya", "Soyah", "Téguéréya", "Timbo", "Tolo"]


def rows():
    if not os.path.exists(CSV):
        return []
    with open(CSV, newline="") as f:
        return list(csv.reader(f))[1:]


def digits(v):
    return re.sub(r"\D", "", str(v or ""))


def fmt_phone(d):
    if len(d) == 11 and d[0] == "1":
        d = d[1:]
    return f"{d[:3]}-{d[3:6]}-{d[6:]}" if len(d) == 10 else "+" + d


def normalize_id(v):
    m = re.search(r"(\d+)", str(v or ""))
    return f"ARM-{int(m.group(1)):04d}" if m else ""


DISTRICTS = {"Dounet": [{"name": "Dindeya", "code": "DY"}]}
SP_CODES = {"Mamou-Centre": ("MC", "Mamou"), "Bouliwel": ("BW", "Mamou"), "Dounet": ("DN", "Timbo"), "Gongoret": ("GG", "Mamou"),
            "Kégnéko": ("KG", "Timbo"), "Konkouré": ("KK", "Mamou"), "N'yagara": ("NG", "Timbo"), "Ouré-Kaba": ("OK", "Mamou"),
            "Porédaka": ("PD", "Timbo"), "Saramoussaya": ("SM", "Timbo"), "Soyah": ("SY", "Mamou"), "Téguéréya": ("TG", "Timbo"),
            "Timbo": ("TB", "Timbo"), "Tolo": ("TL", "Mamou")}
STATE_ABBR = {"New Jersey": "NJ", "New York": "NY", "Pennsylvania": "PA", "Connecticut": "CT", "Maryland": "MD", "Georgia": "GA"}


def card(state, sp, district):
    s = STATE_ABBR.get(state, "INT" if state else "")
    c, pref = SP_CODES.get(sp, ("", ""))
    d = next((x["code"] for x in DISTRICTS.get(sp, []) if x["name"] == district), "")
    return pref, "-".join(x for x in (s, c, d) if x)


def register(data):
    if data.get("website"):
        return {"status": "ok", "memberId": "ARM-0000"}
    d = digits(data.get("phone"))
    if not data.get("firstName") or not data.get("lastName") or not data.get("state") \
            or data.get("group") not in GROUPS or data.get("subpref") not in SUBPREFS or len(d) < 10:
        return {"status": "error", "message": "Invalid data"}
    existing = rows()
    for r in existing:
        if digits(r[4])[-10:] == d[-10:]:
            return {"status": "duplicate", "memberId": r[0]}
    nums = [int(m.group(1)) for r in existing if (m := re.match(r"^ARM-(\d+)$", r[0]))]
    member_id = f"ARM-{(max(nums) if nums else 0) + 1:04d}"
    new = not os.path.exists(CSV)
    with open(CSV, "a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(HEADERS)
        w.writerow([member_id, datetime.now().isoformat(timespec="seconds"),
                    data["firstName"].strip().title(), data["lastName"].strip().title(),
                    fmt_phone(d), data["group"], data["subpref"], data["state"], "Pending",
                    "Yes" if data.get("texts") == "Yes" else "No"])
    pref, code = card(data["state"], data["subpref"], data.get("district", ""))
    return {"status": "ok", "memberId": member_id, "memberStatus": "Pending",
            "district": data.get("district", ""), "prefecture": pref, "cardCode": code}


def lookup(data):
    mid, d = normalize_id(data.get("memberId")), digits(data.get("phone"))[-10:]
    for r in rows():
        if r[0].upper() == mid and digits(r[4])[-10:] == d and len(d) == 10:
            return {"status": "ok", "member": {
                "memberId": r[0], "firstName": r[2], "lastName": r[3], "group": r[5], "subpref": r[6], "state": r[7],
                "registeredAt": r[1], "memberStatus": (r[8] if len(r) > 8 else "") or "Pending", "phoneLast4": d[-4:],
                "district": "", "prefecture": card(r[7], r[6], "")[0], "cardCode": card(r[7], r[6], "")[1]}}
    return {"status": "not_found"}


# ---------- admin (test only: token "dev:<email>" stands in for Google sign-in) ----------
# test accounts and their roles (Full = members + finances)
ADMINS = {"admin@example.com": "Full", "secretary@example.com": "Members", "treasurer@example.com": "Finance"}
TX_FILE = os.path.join(DATA_DIR, "transactions.json")
CATEGORIES = ["Uncategorized", "Donation", "Membership dues", "Building fund", "Education", "Event",
              "Expense", "Bank fee", "Transfer", "Refund", "Other"]


def load_tx():
    return json.load(open(TX_FILE)) if os.path.exists(TX_FILE) else []


def save_tx(t):
    json.dump(t, open(TX_FILE, "w"), indent=1)


def money(v):
    s = str(v or "").strip()
    if not s:
        return 0.0
    neg = s.startswith("(") and s.endswith(")")
    n = float(re.sub(r"[()$,\s]", "", s))
    return -abs(n) if neg else n


def parse_date(v):
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", str(v).strip())
    if m:
        y = int(m.group(3)) + (2000 if len(m.group(3)) == 2 else 0)
        return f"{y:04d}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    m = re.match(r"^(\d{4}-\d{2}-\d{2})", str(v).strip())
    return m.group(1) if m else None


def parse_bank_csv(text):
    rows = list(csv.reader(io.StringIO(text.lstrip("\ufeff"))))
    if len(rows) < 2:
        return None, "No transactions found in the file."
    head = [h.strip().lower() for h in rows[0]]
    col = lambda n: head.index(n) if n in head else -1
    bal = typ = -1
    if col("posting date") > -1 and col("amount") > -1:
        acct, dc, ac, bal, typ = "Chase checking", col("posting date"), col("amount"), col("balance"), col("type")
    elif col("transaction date") > -1 and col("amount") > -1:
        acct, dc, ac, typ = "Chase credit card", col("transaction date"), col("amount"), col("type")
    elif col("date") > -1 and col("amount") > -1:
        acct, dc, ac, bal, typ = "Bank", col("date"), col("amount"), col("balance"), col("type")
    else:
        return None, "Unrecognized file. Download the CSV from chase.com (Account activity → Download)."
    descc = col("description")
    seen, out = {}, []
    for i, r in enumerate(rows[1:], start=2):
        if not any(c.strip() for c in r):
            continue
        d = parse_date(r[dc])
        if not d:
            return None, f"Could not read row {i} of the file."
        amount = money(r[ac])
        balance = money(r[bal]) if bal > -1 and len(r) > bal and r[bal].strip() else None
        desc = " ".join(r[descc].split())[:300]
        base = "|".join([acct, d, desc, f"{amount:.2f}", "" if balance is None else f"{balance:.2f}"])
        seen[base] = seen.get(base, 0) + 1
        out.append({"id": hashlib.sha256(f"{base}#{seen[base]}".encode()).hexdigest()[:20], "date": d,
                    "description": desc, "amount": amount, "type": r[typ].strip() if typ > -1 else "",
                    "balance": balance, "account": acct, "category": "Uncategorized", "notes": ""})
    return out, acct


TEXTS_FILE = os.path.join(DATA_DIR, "texts.json")
TEXT_FOOTER = "\n\nARM Mamou - Reply STOP to opt out / STOP pour vous désabonner"   # same as Texts.gs
MAX_TEXT_CHARS = 640
OPTED_OUT_TEST_PHONE = "5550000000"


def load_json(path):
    return json.load(open(path)) if os.path.exists(path) else []


def write_rows(all_rows):
    with open(CSV, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEADERS)
        w.writerows([r + [""] * (len(HEADERS) - len(r)) for r in all_rows])


def send_texts(data, email):
    """Stands in for Texts.gs sendTexts: prints each text instead of calling Twilio."""
    message = str(data.get("message") or "").replace("\r\n", "\n").strip()
    if not message:
        return {"status": "error", "message": "Write a message first."}
    if len(message) > MAX_TEXT_CHARS:
        return {"status": "error", "message": "The message is too long."}
    test = data.get("testPhone") not in (None, "")
    all_rows = rows()
    if test:
        d = digits(data.get("testPhone"))
        if len(d) < 10:
            return {"status": "error", "message": "Enter a valid phone number for the test."}
        recipients = [(None, d, "Test")]
    else:
        g, sp, st = data.get("group") or "", data.get("subpref") or "", data.get("state") or ""
        recipients = [(r, digits(r[4]), r[2]) for r in all_rows
                      if len(r) > 9 and r[8] == "Active" and r[9] == "Yes"
                      and (not g or r[5] == g) and (not sp or r[6] == sp) and (not st or r[7] == st)]
        if not recipients:
            return {"status": "error", "message": "No member matches this selection."}
    sent, opted = 0, 0
    for r, d, first in recipients:
        if d[-10:] == OPTED_OUT_TEST_PHONE:
            opted += 1
            if r:
                r[9] = "No"
            continue
        body = re.sub(r"(?i)\{first\}", lambda _: first, message) + TEXT_FOOTER
        print(f"[text to +{'1' if len(d) == 10 else ''}{d}] {body}")
        sent += 1
    if opted and not test:
        write_rows(all_rows)
    errors = [f"21610: Attempt to send to unsubscribed recipient{f' (x{opted})' if opted > 1 else ''}"] if opted else []
    if not test:
        log = load_json(TEXTS_FILE)
        log.append({"sentAt": datetime.now().isoformat(timespec="seconds"), "sentBy": email, "message": message,
                    "audience": " · ".join(x for x in ["Active, agreed to texts", data.get("group"), data.get("subpref"), data.get("state")] if x),
                    "recipients": len(recipients), "sent": sent, "failed": opted, "errors": "\n".join(errors)})
        json.dump(log, open(TEXTS_FILE, "w"), indent=1, ensure_ascii=False)
    return {"status": "ok", "test": test, "recipients": len(recipients), "sent": sent, "failed": opted,
            "optedOut": opted if not test else 0, "errors": errors}


# Local test only: password for the shared "admin" login (the real one is set in the spreadsheet menu)
TEST_ADMIN_PASSWORD = os.environ.get("ARM_TEST_ADMIN_PASSWORD", "local-test-only-2026")


def admin(data):
    if data.get("action") == "adminLogin":
        if str(data.get("username", "")).strip().lower() == "admin" and data.get("password") == TEST_ADMIN_PASSWORD:
            return {"status": "ok", "token": "dev:admin@example.com"}
        return {"status": "wrong_password"}
    if data.get("action") == "adminLogout":
        return {"status": "ok"}
    tok = str(data.get("idToken") or "")
    if not tok.startswith("dev:"):
        return {"status": "unauthorized"}
    email = tok[4:].lower()
    if email not in ADMINS:
        return {"status": "forbidden", "email": email}
    a = data.get("action")
    role = ADMINS[email]
    members_actions = ("adminMembers", "adminSetStatus", "adminTexts", "adminSendText")
    if a in members_actions and role not in ("Full", "Members"):
        return {"status": "forbidden", "email": email}
    if a != "adminMe" and a not in members_actions and role not in ("Full", "Finance"):
        return {"status": "forbidden", "email": email}
    if a == "adminMe":
        return {"status": "ok", "email": email, "name": "Test Admin", "role": role}
    if a == "adminMembers":
        return {"status": "ok", "statuses": ["Pending", "Active", "Inactive"], "members": [
            {"memberId": r[0], "registeredAt": r[1], "firstName": r[2], "lastName": r[3], "phone": r[4], "group": r[5],
             "subpref": r[6], "state": r[7], "status": (r[8] if len(r) > 8 else "") or "Pending",
             "texts": "Yes" if len(r) > 9 and r[9] == "Yes" else "No"} for r in rows()]}
    if a == "adminSetStatus":
        if data.get("status") not in ("Pending", "Active", "Inactive"):
            return {"status": "error", "message": "Invalid status."}
        all_rows = rows()
        for r in all_rows:
            if r[0] == data.get("memberId"):
                r[8] = data["status"]
                write_rows(all_rows)
                return {"status": "ok"}
        return {"status": "error", "message": "Member not found."}
    if a == "adminTexts":
        return {"status": "ok", "configured": True, "log": load_json(TEXTS_FILE)[::-1][:50],
                "footer": TEXT_FOOTER, "maxChars": MAX_TEXT_CHARS}
    if a == "adminSendText":
        return send_texts(data, email)
    if a == "adminTransactions":
        return {"status": "ok", "transactions": [dict({"splits": []}, **t, order=i) for i, t in enumerate(load_tx())], "categories": CATEGORIES}
    if a == "adminImport":
        parsed, info = parse_bank_csv(str(data.get("csv") or ""))
        if parsed is None:
            return {"status": "error", "message": info}
        tx = load_tx()
        have = {t["id"] for t in tx}
        fresh = [r for r in parsed if r["id"] not in have]
        save_tx(tx + fresh)
        return {"status": "ok", "format": info, "added": len(fresh), "skipped": len(parsed) - len(fresh)}
    if a == "adminAddTx":
        d = parse_date(data.get("date") or "")
        desc = " ".join(str(data.get("description") or "").split())[:300]
        try:
            amount = round(float(data.get("amount")), 2)
        except (TypeError, ValueError):
            amount = 0
        if not d or not desc or not amount or data.get("category") not in CATEGORIES:
            return {"status": "error", "message": "Enter a date, a description, an amount and a category."}
        t = {"id": "M-" + hashlib.sha256(os.urandom(16)).hexdigest()[:18], "date": d, "description": desc, "amount": amount,
             "type": "MANUAL", "balance": None, "account": str(data.get("account") or "Cash")[:60],
             "category": data["category"], "notes": str(data.get("notes") or "")[:300], "splits": []}
        tx = load_tx()
        tx.append(t)
        save_tx(tx)
        return {"status": "ok", "transaction": t}
    if a == "adminDeleteTx":
        tx = load_tx()
        t = next((x for x in tx if x["id"] == data.get("id")), None)
        if not t:
            return {"status": "error", "message": "Not found."}
        if t.get("type") != "MANUAL":
            return {"status": "error", "message": "Only manual entries can be deleted."}
        save_tx([x for x in tx if x is not t])
        return {"status": "ok"}
    if a == "adminSplit":
        lines, tx = data.get("lines") or [], load_tx()
        t = next((x for x in tx if x["id"] == data.get("id")), None)
        if not t:
            return {"status": "error", "message": "Not found."}
        cents = [round(float(l.get("amount") or 0) * 100) for l in lines]
        total = round(t["amount"] * 100)
        if len(lines) == 1:
            return {"status": "error", "message": "A split needs at least two lines."}
        if any(c == 0 or (c > 0) != (total > 0) for c in cents) or any(l.get("category") not in CATEGORIES for l in lines):
            return {"status": "error", "message": "Every line needs an amount and a category."}
        if lines and sum(cents) != total:
            return {"status": "error", "message": "The lines must add up to the transaction amount."}
        t["splits"] = [{"line": i + 1, "amount": c / 100, "category": l["category"], "notes": str(l.get("notes") or "")[:300]}
                       for i, (l, c) in enumerate(zip(lines, cents))]
        t["category"] = "Split" if lines else ("Uncategorized" if t.get("category") == "Split" else t.get("category"))
        save_tx(tx)
        return {"status": "ok", "category": t["category"]}
    if a == "adminUpdate":
        tx = load_tx()
        for t in tx:
            if t["id"] == data.get("id"):
                if data.get("category") not in CATEGORIES and not (data.get("category") == "Split" and t.get("category") == "Split"):
                    return {"status": "error", "message": "Invalid category."}
                t["category"], t["notes"] = data["category"], str(data.get("notes") or "")[:300]
                save_tx(tx)
                return {"status": "ok"}
        return {"status": "error", "message": "Not found."}
    return {"status": "error", "message": "Unknown action."}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def send_json(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # Clean URLs: /mamou/dounet -> /mamou/dounet.html (same as nginx)
        path = self.path.split("?")[0]
        if "." not in os.path.basename(path) and not path.endswith("/") \
                and os.path.exists(os.path.join(ROOT, path.lstrip("/") + ".html")):
            self.path = path + ".html"
        if self.path.startswith("/mock-api"):
            if "action=districts" in self.path:
                return self.send_json({"status": "ok", "districts": DISTRICTS})
            if "action=projects" in self.path:
                with open(os.path.join(ROOT, "dev", "projects.json")) as f:
                    return self.send_json({"status": "ok", "projects": json.load(f)})
            by = {}
            for r in rows():
                by[r[6]] = by.get(r[6], 0) + 1
            return self.send_json({"status": "ok", "count": len(rows()), "bySubpref": by})
        return super().do_GET()

    def do_POST(self):
        if not self.path.startswith("/mock-api"):
            return self.send_error(404)
        data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or "{}")
        action = str(data.get("action") or "")
        if action.startswith("admin"):
            return self.send_json(admin(data))
        self.send_json(lookup(data) if action == "lookup" else register(data))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"ARM dev server: http://localhost:{port}")
    ThreadingHTTPServer(("", port), Handler).serve_forever()
