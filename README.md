# Hyteam - Movie Watching Platform

A full-stack application for watching movies together with friends.

## Features

- Real-time movie watching with friends
- Voice chat functionality
- Movie search and selection
- Room-based system
- User authentication

## Tech Stack

- **Frontend**: React, Vite, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, MongoDB
- **Database**: MongoDB
- **Deployment**: Vercel (Frontend) + Render (Backend)

## Environment Variables

### Backend (.env)

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
NODE_ENV=production
TMDB_API_KEY=your_tmdb_api_key
CLIENT_URL=your_frontend_url
```

### Frontend (.env)

```
VITE_API_URL=your_backend_url
VITE_SOCKET_URL=your_backend_url
```

## Local Development

### Backend

```bash
cd server
npm install
npm run dev
cd server && node server.js
```

### Frontend

```bash
cd client
npm install
npm run dev
cd client && npm run dev -- --host 0.0.0.0
```

## Deployment

### Backend (Render)

1. Connect your GitHub repository
2. Set environment variables
3. Deploy with build command: `npm install`
4. Start command: `npm start`

### Frontend (Vercel)

1. Connect your GitHub repository
2. Set root directory to `client`
3. Set environment variables
4. Deploy automatically

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/movies/trending` - Get trending movies
- `GET /api/movies/search` - Search movies
- `POST /api/rooms` - Create room
- `GET /api/rooms/:id` - Get room details
