# Backend - Social Media Management Platform

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the `backend/` directory with:
```
PORT=5000
MONGODB_URI="your_mongodb_connection_string"
JWT_SECRET="your-secret-key"
```

3. Run the server:
```bash
npm run dev
```

## Structure

```
backend/
├── src/
│   ├── database/
│   │   ├── connection.js
│   │   └── config.js
│   ├── middleware/
│   │   └── requireAuth.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── auth.js
│   └── index.js
├── package.json
└── .env
```

## API Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Signup
- `GET /health` - Health check

