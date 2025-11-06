# Social Media Management Platform

A full-stack social media management platform with clean frontend/backend separation.

## Project Structure

```
social-media-management-platform/
├── frontend/
│   └── public/          # Frontend files (HTML, CSS, JS)
│       ├── app.js
│       ├── home.html
│       ├── login.html
│       ├── signup.html
│       └── styles.css
│
├── backend/
│   ├── src/            # Backend source code
│   │   ├── database/   # Database connection & config

│   │   ├── middleware/ # Express middleware
│   │   ├── models/     # Database models
│   │   ├── routes/     # API routes
│   │   └── index.js    # Express server entry point
│   ├── package.json
│   ├── package-lock.json
│   └── .env
│
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Backend

Create a `backend/.env` file:

```env
PORT=5000
MONGODB_URI="your_mongodb_connection_string"
JWT_SECRET="your-secret-key"
```

### 3. Run Development Server

```bash
cd backend
npm run dev
```

The server will start on `http://localhost:5000`

## Frontend

Located in `frontend/public/`:
- Static HTML files (login, signup, home)
- JavaScript for authentication and API calls
- CSS styles

The Express server serves these files as static assets from `../frontend/public`.

## Backend

Located in `backend/src/`:
- Express server (`index.js`)
- API routes (`/api/auth/*`)
- Database models and connection
- Middleware for authentication

**All backend dependencies are in `backend/package.json`**

## API Endpoints

- `POST /api/auth/login` - User login
  - Body: `{ email, password }`
  - Returns: `{ token, user }`

- `POST /api/auth/signup` - User signup
  - Body: `{ name, email, password }`
  - Returns: `{ token, user }`

- `GET /health` - Health check

## Routes

- `GET /` - Login page
- `GET /signup` - Signup page
- `GET /home` - Home page (protected)
- `GET /home.html` - Home page (protected)

## Running the Project

### Development
```bash
cd backend
npm run dev
```

### Production
```bash
cd backend
npm start
```

## Notes

- Frontend and backend are cleanly separated
- Express serves static files from `frontend/public`
- API routes are under `/api/...`
- After successful login, redirects to `/home.html`
- Token is stored in localStorage as `auth_token`
- All backend dependencies are managed in `backend/package.json`
