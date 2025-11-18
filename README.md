# Social Media Management SaaS Platform

A comprehensive social media management platform for scheduling, publishing, and analyzing content across Instagram and Facebook. Built with React, Node.js, and MongoDB.

## 🚀 Features

### Content Management
- **Multi-Platform Publishing**: Schedule and publish posts to Instagram and Facebook
- **Post Types**: Support for Posts, Reels, Stories, IGTV, and Live streams
- **Media Upload**: Upload images, videos, and carousels with drag-and-drop interface
- **Format Selection**: Choose from Square (1:1), Portrait (4:5), Landscape (1.91:1), Reel/Story (9:16)
- **Scheduling**: Schedule posts for future publishing with automatic timezone handling
- **Draft Management**: Save drafts and edit before publishing
- **Edit & Delete**: Edit draft/scheduled posts or update metadata for published posts

### Client Management
- **Multi-Client Support**: Manage multiple social media accounts
- **OAuth Integration**: Connect Instagram and Facebook accounts via OAuth 2.0
- **Account Permissions**: Role-based access control (Admin, Manager)
- **Client Capabilities**: Track platform-specific permissions and features

### Analytics & Insights
- **Real-Time Analytics**: View engagement metrics from Instagram Graph API
- **Performance Metrics**: Track followers, views, impressions, reach, and engagement
- **Trend Analysis**: Daily trends for followers and engagement over 30 days
- **Post Performance**: Individual post metrics (likes, comments, saves, video views)
- **Client Performance**: Compare performance across different clients

### Reports
- **Custom Reports**: Generate PDF reports with analytics data
- **Report Templates**: Upload and use custom report templates
- **Scheduled Reports**: Automatically send reports via email
- **Date Range Selection**: Generate reports for custom date ranges

### User Experience
- **Modern UI**: Beautiful, responsive dashboard built with React and Tailwind CSS
- **Search & Filters**: Advanced filtering by platform, post type, status, and date
- **Pagination**: Efficient pagination for large post lists
- **Media Gallery**: Full-screen gallery view for post media
- **Real-Time Updates**: Live updates when posts are published or scheduled

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Recharts** - Chart library for analytics
- **html2canvas & jsPDF** - PDF report generation

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Multer** - File upload handling
- **Sharp** - Image processing
- **Nodemailer** - Email service
- **Axios** - HTTP client

### APIs & Integrations
- **Instagram Graph API** - Instagram Business API integration
- **Facebook Graph API** - Facebook page management
- **OAuth 2.0** - Social media account authentication

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v6 or higher)
- **npm** or **yarn**
- **Facebook Developer Account** (for OAuth setup)
- **Instagram Business Account** (connected to Facebook Page)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/chemmu111/saas-by-haca.git
cd saas-by-haca
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
API_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/social-media-manager

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Facebook/Instagram OAuth
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Frontend Setup

```bash
cd frontend/dashboard
npm install
```

### 4. Start Development Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend/dashboard
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🔐 Authentication

### User Roles
- **Admin**: Full access to all features
- **Manager**: Limited access to assigned clients

### Creating an Admin User

```bash
cd backend
npm run create:admin
```

Follow the prompts to create an admin user.

## 📱 OAuth Setup

### Facebook/Instagram OAuth Configuration

1. **Create a Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app
   - Add Instagram Basic Display and Facebook Login products

2. **Configure OAuth Redirect URIs**
   - **Instagram**: `http://localhost:5000/auth/instagram/callback`
   - **Facebook**: `http://localhost:5000/auth/facebook/callback`
   - For production/ngrok, add your domain URLs

3. **Add App Domains**
   - Add `localhost` (and your production domain) to App Domains in Facebook App Settings

4. **Update Environment Variables**
   - Add `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` to `.env`

For detailed OAuth setup instructions, see:
- `backend/CONFIGURE_LOCALHOST_OAUTH.md`
- `backend/FIX_NGROK_OAUTH.md`
- `backend/QUICK_FIX_FACEBOOK_OAUTH.md`

## 🌐 ngrok Setup (For External Access)

### 1. Install ngrok
```bash
npm install -g ngrok
# or download from https://ngrok.com/
```

### 2. Start ngrok Tunnel
```bash
ngrok http 5000
```

### 3. Update Facebook OAuth Settings
- Add your ngrok URL to Facebook App Domains
- Add redirect URIs with your ngrok domain

The backend automatically detects ngrok and uses the correct redirect URIs.

## 📁 Project Structure

```
saas-by-haca/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── database/         # Database configuration
│   │   ├── middleware/       # Auth & role middleware
│   │   ├── models/           # Mongoose models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utility functions
│   ├── uploads/              # Uploaded media files
│   └── package.json
├── frontend/
│   └── dashboard/
│       ├── src/
│       │   ├── hooks/         # Custom React hooks
│       │   ├── lib/          # Utility functions
│       │   └── *.jsx         # React components
│       └── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### OAuth
- `POST /api/oauth/authorize` - Initiate OAuth flow
- `GET /api/oauth/callback/:platform` - OAuth callback

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/publish` - Publish post immediately

### Analytics
- `GET /api/analytics/overview` - Get overview metrics
- `GET /api/analytics/trends` - Get trend data
- `GET /api/analytics/posts` - Get post analytics
- `GET /api/analytics/client-performance` - Get client performance

### Reports
- `GET /api/reports/generate` - Generate report
- `POST /api/reports/templates` - Upload template
- `GET /api/reports/templates` - Get templates

## 🚀 Deployment

### Production Build

**Frontend:**
```bash
cd frontend/dashboard
npm run build
```

**Backend:**
```bash
cd backend
npm start
```

### Environment Variables for Production

Update `.env` with production values:
- Set `NODE_ENV=production`
- Update `API_URL` to your production domain
- Use secure `JWT_SECRET`
- Configure production MongoDB URI
- Update OAuth redirect URIs in Facebook App settings

## 🧪 Development

### Running Tests
```bash
# Backend tests (if available)
cd backend
npm test

# Frontend tests (if available)
cd frontend/dashboard
npm test
```

### Code Structure
- **Backend**: RESTful API with Express
- **Frontend**: Component-based React architecture
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Styling**: Tailwind CSS utility classes

## 📝 Documentation

Additional documentation available in the `backend/` directory:
- `CONFIGURE_LOCALHOST_OAUTH.md` - OAuth setup guide
- `FIX_NGROK_OAUTH.md` - ngrok OAuth configuration
- `QUICK_FIX_FACEBOOK_OAUTH.md` - Quick OAuth troubleshooting
- `EDIT_DELETE_FEATURES.md` - Edit/Delete functionality
- `INSTAGRAM_ANALYTICS_IMPLEMENTATION.md` - Analytics setup

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For issues and questions:
1. Check the documentation in the `backend/` directory
2. Review existing GitHub issues
3. Create a new issue with detailed information

## 🎯 Roadmap

- [ ] Support for additional platforms (Twitter, LinkedIn)
- [ ] Advanced analytics and reporting
- [ ] Team collaboration features
- [ ] Mobile app
- [ ] AI-powered content suggestions
- [ ] Bulk post scheduling
- [ ] Content calendar view

## 🙏 Acknowledgments

- Instagram Graph API
- Facebook Graph API
- React Community
- MongoDB
- All open-source contributors

---

**Built with ❤️ by HACA Tech**

