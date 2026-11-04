# Jogaar

Jogaar is a crowdfunding platform for small businesses and aspiring entrepreneurs in Bangladesh.

## Features

- **Discover**: search campaigns, filter by category, sort them, and show or hide ended campaigns.
- **Campaign pages**: story, funding progress, backers, days left, and recent supporters with their messages.
- **Back a campaign**: preset or custom amount, bKash / Nagad / Card, a message, and an anonymous option. Checkout is a demo and charges nothing.
- **Start a campaign**: a validated form with an optional cover image upload.
- **Accounts**: sign up, log in, log out, and protected pages that send you back where you were after logging in.
- **Dashboard**: totals, your campaigns, your contributions, and profile settings.
- **Info pages**: how it works, success stories, FAQ, and a 404 page.
- Responsive layout for phone, tablet and desktop.

## Getting started

```bash
npm install
npm start      # http://localhost:3000
npm test       # run the test suite
npm run build  # production build in ./build
```

## Data and backend

The app works with no server. Accounts, campaigns and contributions are stored in the
browser's `localStorage`, and passwords are stored only as salted SHA-256 hashes.
This is for demos and development only, because every user's data stays in their own browser.

To use a real backend for authentication, copy `.env.example` to `.env.local` and set
`REACT_APP_API_URL`. See `src/api/client.js` for the endpoints the app expects. Campaigns and
contributions stay in the local store until the backend has endpoints for them.

## Project structure

```
src/
  api/client.js          data layer (local store + optional remote auth)
  context/AuthContext.js session state
  components/            Navbar, Footer, CampaignCard, form fields, FAQ…
  pages/                 Home, Discover, CampaignDetail, StartCampaign, Auth, Dashboard, Info, NotFound
  data/seed.js           starter campaigns, stories, FAQ
  styles/global.css      design system and all styles
  assets/images/         optimised images
```
