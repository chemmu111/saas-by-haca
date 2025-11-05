# Building the Dashboard

## Quick Setup

1. **Navigate to the dashboard directory:**
```bash
cd frontend/dashboard
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the dashboard:**
```bash
npm run build
```

This will create the production build in `frontend/public/dashboard/` which will be served by your Express server.

4. **Start your backend server:**
```bash
cd ../../backend
npm run dev
```

## Development Mode

To run the dashboard in development mode (with hot reload):

```bash
cd frontend/dashboard
npm run dev
```

This will start Vite dev server on `http://localhost:3000`

## Production Build

After building, the dashboard will be available at:
- `/dashboard` - Main dashboard route
- `/home` - Alternative route (also serves dashboard)

The Express server automatically serves the built files from `frontend/public/dashboard/`.

## Login Flow

After successful login, users with role "social media manager" will be automatically redirected to `/dashboard`.

## Notes

- The dashboard automatically extracts user name from JWT token in localStorage
- Statistics are currently using dummy data (1 client, 0 posts)
- All icons are from Lucide React
- Design is fully responsive with Tailwind CSS

