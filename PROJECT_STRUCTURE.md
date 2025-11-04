# Project Structure - Social Media Management Platform

## New Structure

The project has been reorganized into clear frontend and backend separation:

```
social-media-management-platform/
├── frontend/
│   └── public/
│       ├── app.js
│       ├── home.html
│       ├── login.html
│       ├── signup.html
│       └── styles.css
│
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── connection.js
│   │   │   ├── config.js
│   │   │   └── README.md
│   │   ├── middleware/
│   │   │   └── requireAuth.js
│   │   ├── models/
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   └── auth.js
│   │   └── index.js
│   ├── package.json
│   ├── .env
│   └── README.md
│
├── package.json
└── README.md
```

## Frontend

Located in `frontend/public/`:
- **app.js** - Main JavaScript with authentication logic
- **login.html** - Login page
- **signup.html** - Signup page
- **home.html** - Home page (protected)
- **styles.css** - Stylesheet

## Backend

Located in `backend/src/`:
- **index.js** - Express server entry point
- **database/** - Database connection and configuration
- **middleware/** - Express middleware (auth, etc.)
- **models/** - Database models (User, etc.)
- **routes/** - API routes (auth, etc.)

## Configuration

### Backend Paths
- Express serves static files from: `../frontend/public`
- API routes: `/api/auth/*`
- Main entry: `backend/src/index.js`

### Frontend Paths
- Redirects to: `/home.html` after login
- API calls: `/api/auth/login`, `/api/auth/signup`

## Running the Project

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Routes

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User signup
- `GET /health` - Health check

## Static Routes

- `GET /` - Login page
- `GET /signup` - Signup page
- `GET /home` - Home page
- `GET /home.html` - Home page

