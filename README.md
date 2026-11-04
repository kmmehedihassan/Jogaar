# Jogaar

Jogaar is a crowdfunding platform for small businesses and aspiring entrepreneurs in Bangladesh.

## Features

- **Discover**: search campaigns, filter by category, sort them, and show or hide ended campaigns.
- **Campaign pages**: story, updates, comments and backers tabs, funding progress and days left.
- **Reward tiers**: owners offer up to 5 rewards with a minimum amount and an optional quantity limit; backers pick one when they contribute.
- **Back a campaign**: preset or custom amount, bKash / Nagad / Card, a message, and an anonymous option. Checkout is a demo and charges nothing.
- **Comments**: signed-in users can comment; owners get a "Creator" badge and can remove comments on their campaign.
- **Owner tools**: start, edit and delete (if unfunded) campaigns, and post updates for backers.
- **Accounts**: sign up, log in, change password, profile settings, saved campaigns and a dashboard.
- **Notifications**: a bell in the navbar tells owners about new contributions and comments, backers about campaign updates, and owners when their campaign is verified or hidden.
- **Reporting and moderation**: anyone signed in can report a campaign or comment. Admins get an admin page to review reports, remove comments, hide campaigns and mark campaigns as verified (shown with a blue badge).
- **Bangla and English**: switch language from the navbar; numbers and dates use Bangla digits.
- **Dark mode**, notifications, loading placeholders, and a responsive layout for phone, tablet and desktop.

## Getting started

```bash
npm install
```

### Option 1 — website only (no server)

```bash
npm start
```

Opens http://localhost:3000. All data is kept in your browser's `localStorage`, so each visitor sees only their own accounts and contributions. Good for demos.

### Option 2 — full app with the server

The server (`server/`) is Node.js + Express with a SQLite database. It stores accounts, campaigns, rewards, contributions, comments and saved campaigns, and serves the website.

```bash
npm run build:server   # build the website to talk to the server
npm run server         # http://localhost:4000
```

The database is created at `server/data/jogaar.db` with the sample campaigns on first run. Settings:

| Variable    | Default                 | Purpose                        |
| ----------- | ----------------------- | ------------------------------ |
| `PORT`      | `4000`                  | Port the server listens on     |
| `JOGAAR_DB` | `server/data/jogaar.db` | Path to the SQLite file        |
| `ADMIN_EMAILS` | _(none)_             | Comma-separated emails of admin accounts, e.g. `you@example.com` |

Admins see an **Admin** link in their account menu. In the browser-only mode (Option 1), the first account created in a browser is the admin, so you can try the admin tools without a server.

### Option 3 — Docker

```bash
docker build -t jogaar .
```

```bash
docker run -p 4000:4000 -v jogaar-data:/app/server/data -e ADMIN_EMAILS=you@example.com jogaar
```

The `jogaar-data` volume keeps the database between restarts.

**While developing**, run the server and the React dev server side by side:

```bash
npm run server
```

and in a second terminal, with `REACT_APP_API_URL=/api` in `.env.local`:

```bash
npm start
```

The dev server forwards `/api` requests to port 4000.

### Tests

```bash
npm test             # website tests
npm run test:server  # API tests
```

GitHub Actions (`.github/workflows/ci.yml`) runs both test suites and a production build on every pull request and on every push to `master`.

## Security notes

- Passwords are hashed with scrypt and a per-user salt; session tokens are random and stored only as SHA-256 hashes, and expire after 30 days.
- Changing a password signs out the account's other sessions. Repeated failed logins are rate-limited.
- All input is validated on the server; uploaded cover images must be JPEG, PNG or WebP and under about 1 MB.
- Payments are a demo. Connect a real payment provider before handling money.

## Project structure

```
src/
  api/                   data layer: local.js (browser store), remote.js (server), client.js picks one
  context/AuthContext.js session state
  components/            Navbar, Footer, CampaignCard, form fields, FAQ…
  pages/                 Home, Discover, CampaignDetail, StartCampaign, Auth, Dashboard, Info, NotFound
  data/                  sample campaigns (campaigns.json, shared with the server) and stories
  i18n/strings.js        English and Bangla text
  styles/global.css      design system and all styles
  assets/images/         optimised images
server/
  app.js                 REST API (/api/...)
  db.js                  SQLite schema and sample data
  index.js               starts the server and serves the built website
  test/                  API tests
```
