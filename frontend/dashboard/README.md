# Social Media Manager Dashboard

A responsive React + Tailwind CSS dashboard for Social Media Managers.

## Features

- ✅ Left sidebar with menu items (Overview, Clients, Posts, Analytics, Reports)
- ✅ Top bar with user name and Sign Out button
- ✅ Welcome message with user name
- ✅ Four statistic cards with icons:
  - Total Clients (blue)
  - Total Posts (green)
  - Scheduled Posts (yellow)
  - Published Posts (purple)
- ✅ Smooth hover animations and shadows
- ✅ Fully responsive design (desktop + mobile)
- ✅ "Made in Bolt" footer
- ✅ Uses Lucide React icons
- ✅ Dynamic data from local state (simulated API)

## Setup

1. Install dependencies:
```bash
cd frontend/dashboard
npm install
```

2. Run development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

3. Build for production:
```bash
npm run build
```

The built files will be in `frontend/public/dashboard/`

## Integration

To integrate with the existing app, update the redirect in `frontend/public/app.js` to point to the dashboard:

```javascript
window.location.href = '/dashboard/index.html';
```

Or serve the built dashboard from the Express server by updating the static file serving in `backend/src/index.js`.

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React (for icons)

