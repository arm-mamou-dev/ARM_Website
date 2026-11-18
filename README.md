# ARM – Association Des Ressortissants de Mamou website

Static website (English + French) with member registration, member login / status, and a projects page.
All data lives in one **Google Sheet** ("ARM Members"), reached through a Google Apps Script web app.

## Pages

| Page | File | What it does |
|---|---|---|
| Home | `index.html` | Introduction and links to everything else |
| About | `about.html` | Mission, member groups (Male / Female), why register |
| Federation | `federation.html` | ARM's federal structure and the 14 member sub-prefectures |
| Sub-prefectures | `mamou/<name>.html` | One page each (e.g. `/mamou/dounet`): population, map, association website, member count |
| Projects | `projects.html` | Projects and timelines, read from the Sheet |
| FAQ | `faq.html` | Common questions |
| Register | `register.html` | Registration form; shows the new member ID and card |
| Member login | `member.html` | Log in with Member ID + phone to see status and details |
| Admin | `admin.html` (footer link) | Google sign-in for admins. **Members** tab: all members, change status, export CSV. **Finances** tab: bank balance and transactions, import Chase CSV. **Texts** tab: send a text message to members |

## The database (Google Sheet)

| Tab | Columns | Managed by |
|---|---|---|
| **Members** | Member ID, Registered At, First Name, Last Name, Phone, Group, Sub-prefecture, State of Residence, **Status**, **Texts** | Website adds rows; leadership sets Status (Pending → Active / Inactive). Texts = Yes when the member agreed to receive texts |
| **Text Log** | Sent At, Sent By, Message, Audience, Recipients, Sent, Failed, Errors | Filled automatically by each send from the Texts tab |
| **Projects** | Project ID, Title, Summary, Status, Start, End, Goal ($), Raised ($), Show on website | Leadership |
| **Project Phases** | Project ID, Phase, Start, End, Status (blank = worked out from dates) | Leadership |

A second, **private** spreadsheet, "ARM Finances – private", is created automatically by `setup` and is
only visible to its owner, so sharing the member sheet never exposes bank data:

| Tab | Columns | Managed by |
|---|---|---|
| **Admins** | Email, Name, Added, **Role** (Full / Members / Finance) | Owner adds each admin's Google email and role |
| **Transactions** | Transaction ID, Date, Description, Amount, Type, Balance, Account, Category, Notes, Imported At/By, Source File | Filled by CSV import; admins set Category/Notes on the admin page |

Rules enforced by `apps-script/Code.gs` and `Admin.gs`:
- one registration per phone number (duplicates are told their existing ID)
- IDs are sequential (ARM-0001, ARM-0002…), with a lock so two people never get the same one
- login requires Member ID **and** phone; the phone number is never sent back; 10 failed tries per ID → 10-minute wait
- admin requests must carry either a Google sign-in token (email on the Admins tab, with its role) or a session from the shared admin password
- importing the same Chase file twice never creates duplicates
- text starting with `=`, `+`, `-` or `@` is stored as plain text, never run as a spreadsheet formula

## Sub-prefecture pages

Generated from the data at the top of `dev/build_subprefectures.py` (population from the 2014 census, map
coordinates, and each local association's website). To add a website, e.g. for Timbo, add it to `WEBSITES` and run:

```bash
python3 dev/build_subprefectures.py
```

## 1. Test locally

```bash
python3 dev/mock_server.py
```
Open http://localhost:8080. A test backend stands in for Google Sheets:
members go to `dev/members.csv`, projects come from `dev/projects.json`.

## 2. Create the database

1. Turn **on** "Google Apps Script API" at https://script.google.com/home/usersettings
2. Run:
   ```bash
   ./deploy/setup-database.sh
   ```
   It signs you in to Google, creates the **ARM Members** spreadsheet with the backend script,
   asks you to run `setup` once in the script editor (this authorizes it and creates the tabs),
   publishes the web app, and writes its URL into `config.js`.
3. Share the spreadsheet with ARM leadership.

After editing `apps-script/Code.gs`: `./deploy/setup-database.sh update` (keeps the same URL).

## 3. Turn on admin sign-in

1. Google Cloud Console → **APIs & Services → OAuth consent screen**: set it up (type *External*, app name "ARM Admin").
2. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   Authorized JavaScript origins: `https://your-domain.org` and `http://localhost:8080`.
3. Copy the **Client ID** into **both** `config.js` (`GOOGLE_CLIENT_ID`) and `apps-script/Admin.gs` (`GOOGLE_CLIENT_ID`),
   then run `./deploy/setup-database.sh update`.
4. To add an admin: open **ARM Finances – private** in the owner's Google Drive → **Admins** tab → add their Google email
   and a **Role**: *Full* (members + finances), *Members* (member list only) or *Finance* (bank only).

**Shared admin password (backup login):** open the **ARM Members** spreadsheet → menu **ARM Admin → Set admin password…**
(username is `admin`; the password must be 12+ characters and is stored only as a salted hash). This login has *Full* access.
5 wrong tries lock it for 15 minutes; Google sign-in keeps working. **ARM Admin → Turn off password login** disables it.

Google sign-in only works on `https://` addresses (or localhost), so the live site needs a domain with HTTPS (step 4).

Bank data: on chase.com open the account → download icon → CSV → then **Import Chase CSV** on the admin page.
Cash and other money not at the bank: **+ Add transaction** on the admin page (manual entries can be deleted; imported
bank transactions cannot). Any transaction can be **split** into lines with their own category.
Locally, "Sign in as test admin" works and `dev/sample_chase_checking.csv` contains made-up transactions to try.

## 4. Deploy to a Google Cloud VM

```bash
gcloud config set project YOUR_ARM_PROJECT_ID
./deploy/deploy.sh create   # first time: e2-micro VM + nginx + firewall, uploads the site
./deploy/deploy.sh          # later: re-upload the site
```

Custom domain + HTTPS: point an A record at the VM IP, then on the VM run
`sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx -d yourdomain.org`.

## 5. Turn on text messages (Twilio)

Admins with the *Full* or *Members* role send texts from the **Texts** tab of the admin page. Texts go only to
**Active** members whose **Texts** column is **Yes** (members tick the box when registering), optionally filtered by
group, sub-prefecture or state. `{first}` in a message becomes each member's first name, and every text ends with
"ARM Mamou - Reply STOP to opt out". A member who replies STOP is blocked by Twilio and set to Texts = No at the next send.

1. Create an account at https://www.twilio.com and buy a US phone number (~$1.15/month).
2. **Register for US texting (required, takes 1–3 weeks):** Twilio Console → Messaging → Regulatory Compliance →
   A2P 10DLC. Register ARM as a brand (nonprofit; you need the EIN) and a campaign of type *Low Volume Mixed*
   or *Marketing*. Use this as the opt-in description: "Members opt in by ticking a box on the registration form at
   <your website>/register". Texts to US numbers are blocked until the campaign is approved.
3. Open the **ARM Members** spreadsheet → menu **ARM Admin → Set up texting (Twilio)…** and paste the Account SID,
   Auth Token and the phone number (or a Messaging Service SID, `MG…`). They are checked with Twilio and stored in
   Script Properties, never in the code. **ARM Admin → Turn off texting** removes them.
4. Upload the new code: `./deploy/setup-database.sh update`, then open the script editor and run `setup` once
   (adds the Texts column and its dropdown).
5. On the admin page, **Texts** tab → enter your own number → **Send test**.

Members who registered before the checkbox existed have no Texts value: set it to **Yes** only when the member has
agreed (in writing, e.g. a sign-up sheet or a text from them). US law (TCPA) requires this consent.

Cost: about $0.01 per SMS (160 characters, or 70 with characters such as ê, ç or emoji). The page shows how many
SMS a message will use before you send it. Locally, the test server prints texts instead of sending them, and a
test to 555-000-0000 behaves like a member who replied STOP.
