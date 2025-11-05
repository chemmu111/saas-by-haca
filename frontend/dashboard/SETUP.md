# Dashboard Setup Guide

## Quick Start

1. **Navigate to the dashboard directory:**
```bash
cd frontend/dashboard
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run development server:**
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## Building for Production

To build the dashboard for production:

```bash
npm run build
```

This will create optimized files in `frontend/public/dashboard/` that can be served by your Express server.

## Integration with Existing App

To integrate the dashboard with your existing app, you have two options:

### Option 1: Update the redirect in app.js

In `frontend/public/app.js`, update the redirect for social media managers:

```javascript
window.location.href = '/dashboard/index.html';
```

### Option 2: Serve the built dashboard from Express

After building, the dashboard will be in `frontend/public/dashboard/`. Your Express server should automatically serve it from there.

Then update the redirect:

```javascript
window.location.href = '/dashboard/index.html';
```

## Features

✅ Responsive sidebar with menu items
✅ Top bar with user name and Sign Out
✅ Welcome message with dynamic user name
✅ Four statistic cards with hover animations
✅ Mobile-responsive design
✅ "Made in Bolt" footer
✅ Lucide React icons

## Development

The dashboard uses:
- **React 18** for UI components
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Notes

- The dashboard automatically extracts the user name from the JWT token stored in localStorage
- Statistics are currently using dummy data (simulated API call with 500ms delay)
- The sidebar is responsive: closed on mobile, open on desktop by default
- All animations and hover effects are included

