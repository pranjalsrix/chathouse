# ChatHouse — Real-Time Chat Application

A full-stack real-time chat application built with the MERN stack, featuring passwordless email authentication, instant messaging, online presence, and friend management.

## Features

- Passwordless email OTP authentication with JWT
- Real-time messaging using Socket.IO
- Online presence and typing indicators
- Message-seen status and emoji reactions
- Friend requests with accept, reject, cancel, and remove actions
- User search by username, email, or unique ID
- Automatically generated avatars
- Responsive chat interface

## Tech Stack

- **Frontend:** React, Vite, React Router, Axios, CSS
- **Backend:** Node.js, Express.js, Socket.IO
- **Database:** MongoDB, Mongoose
- **Authentication:** JWT, email OTP, Nodemailer, Google Apps Script fallback
- **Tools:** Git, GitHub, Postman

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB local instance or MongoDB Atlas
- Gmail account with an App Password for Nodemailer email delivery

### Installation

Clone the repository and install dependencies:

```bash
npm run install-all
```

Create `server/.env` using `server/.env.example` as a template:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
GOOGLE_APPS_SCRIPT_URL=your_apps_script_web_app_url
GOOGLE_APPS_SCRIPT_SECRET=your_apps_script_secret
```

Replace the placeholder values with your configuration. Never commit real credentials or secrets.

Start the application:

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5000

## Deployment Guide

ChatHouse uses Vercel for the frontend, Render for the backend, MongoDB Atlas for the database, and Google Apps Script as the fallback email sender.

### 1. MongoDB Atlas

- Create a MongoDB Atlas cluster and database user.
- Configure network access to allow connections from your backend host.
- Copy the MongoDB connection string for `MONGO_URI`.

### 2. Deploy the backend to Render

- Create a new Web Service connected to your GitHub repository.
- Set the root directory to `server`.
- Use `npm install` as the build command and `npm start` as the start command.
- Add the required environment variables in Render:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=https://your-frontend.vercel.app
GOOGLE_APPS_SCRIPT_URL=your_apps_script_web_app_url
GOOGLE_APPS_SCRIPT_SECRET=your_apps_script_secret
```

- Deploy the service and copy its public URL.

### 3. Configure Google Apps Script

- Deploy the email script as a web app, executing as your account and allowing access required by your backend.
- Set `CHAT_HOUSE_SECRET` in Apps Script Project Settings.
- Configure the matching `GOOGLE_APPS_SCRIPT_URL` and `GOOGLE_APPS_SCRIPT_SECRET` in Render.

The script is used as a fallback when Nodemailer fails. Apps Script has daily email recipient quotas.

### 4. Deploy the frontend to Vercel

- Import the repository into Vercel.
- Set the frontend root directory to the project directory containing `package.json` and the Vite configuration.
- Add the frontend environment variable used by the application to point to the deployed Render backend.
- Deploy and set `CLIENT_URL` in Render to the Vercel deployment URL.

Ensure the backend CORS configuration allows the deployed frontend origin. Redeploy the backend after changing its environment variables.

**Important:** Keep `.env` files, email credentials, JWT secrets, and Apps Script secrets out of Git.

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/send-otp` | Send email OTP |
| POST | `/auth/verify-otp` | Verify OTP |
| POST | `/auth/create-user` | Create user account |
| GET | `/users/me` | Get current user |
| GET | `/users/search?q=` | Search users |
| GET | `/friends` | Get friends and requests |
| POST | `/friends/request` | Send friend request |
| POST | `/friends/accept` | Accept friend request |
| GET | `/messages/:userId` | Retrieve conversation |

Protected routes require JWT authentication.

## Real-Time Communication

Socket.IO powers instant messaging and presence updates.

Key events include `send-message`, `receive-message`, `typing`, `stop-typing`, `message-seen`, `online-users`, and `add-reaction`.

## Authentication & OTP Security

- Six-digit email verification codes
- Five-minute OTP expiration
- Maximum of three OTP requests per email within ten minutes
- OTP removal after successful verification
- JWT-protected routes

OTP codes are stored temporarily in server memory and are cleared when the server restarts.

## Demo Data

Populate the database with sample users, friend connections, and messages:

```bash
node server/src/seed.js
```

The seed script creates five demo users, five friend links, and twenty messages.

## Author

**Pranjal Srivastava**

GitHub: https://github.com/pranjalsrix
