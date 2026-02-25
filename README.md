# Counseling Session Booking System

A simplified booking system for psychology/counseling sessions at the University of Mauritius.

## Features

- **Simple Booking**: Students can book any available slot - no complex rules
- **Student Authentication**: Sign up and login with UoM email
- **Admin Dashboard**: View all bookings and student credentials
- **Responsive Design**: Works on desktop and mobile

## Getting Started

### 1. Prerequisites

- Web Browser: Chrome, Firefox, Edge, or Safari
- Firebase Project: Configure your Firebase credentials in `config/env-config.js`

### 2. Setup

1. Copy `config/env-config.example.js` to `config/env-config.js`
2. Configure Firebase credentials in `config/env-config.js`
3. Set up Firebase Realtime Database rules (see `firebase.rules.json`)
4. Open `index.html` in your browser

### 3. Usage

#### For Students

1. **Sign Up**: Create an account with your UoM email
2. **Login**: Enter your credentials
3. **Book Session**: Select an available time slot and fill in your details
4. **View Bookings**: See your upcoming sessions

#### For Admins

1. **Login** with an admin account
2. **Access Dashboard**: View all bookings and student information
3. **Manage Bookings**: View student credentials and booking details

## Project Structure

```
Counseling Booking/
├── index.html              # Main booking page
├── login.html              # Login page
├── signup.html             # Sign up page
├── dashboard/
│   ├── dashboard.html      # Admin dashboard
│   ├── dashboard.js        # Dashboard logic
│   └── dashboard-style.css # Dashboard styles
├── config/
│   ├── env-config.js       # Environment configuration
│   └── firebase-config.js  # Firebase configuration
├── firebase.js             # Firebase integration
├── firebase.rules.json     # Database security rules
├── script.js               # Main booking logic
└── style.css               # Main styles

```

## Booking Rules

- **Simple Rule**: If a slot is available, students can book it
- No restrictions on booking frequency
- No advance booking requirements
- First come, first served

## Firebase Configuration

1. Copy the example configuration file:
   ```bash
   cp config/env-config.example.js config/env-config.js
   ```

2. Set up your Firebase project and add credentials to `config/env-config.js`:
   ```javascript
   const developmentConfig = {
     FIREBASE_API_KEY: "your-api-key",
     FIREBASE_AUTH_DOMAIN: "your-project.firebaseapp.com",
     FIREBASE_DATABASE_URL: "https://your-project.firebaseio.com",
     FIREBASE_PROJECT_ID: "your-project-id",
     // ... other config
   };
   ```

**Note:** Never commit `config/env-config.js` to version control as it contains sensitive credentials.
