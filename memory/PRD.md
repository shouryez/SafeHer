# SafeHer - AI-Powered Women's Travel Safety App

## Product Overview
SafeHer is a mobile-first safety app for women travelers, featuring AI-powered route analysis, real-time trip monitoring, emergency SOS alerts, and crowdsourced safety scoring.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54) with expo-router
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: MongoDB
- **AI**: Google Gemini 2.5 Flash via Emergent LLM Key
- **Auth**: JWT-based custom authentication

## Core Features

### 1. Authentication
- Email + password registration and login
- JWT token-based session management
- Persistent auth state with AsyncStorage

### 2. Home Dashboard
- Time-based greeting with user name
- 3 travel mode cards: Cab/Taxi, Public Transport, Walking
- Persistent bottom action bar: SOS, Suspicious, Report, Call
- Animated SOS button with pulse effect

### 3. Smart Ride Check (Cab/Taxi Flow)
- Enter pickup, destination, and optional vehicle number
- Start trip monitoring with live status indicators
- Route status, speed monitoring, GPS signal, audio recording status
- Emergency SOS during ride
- End trip with 1-5 star safety rating

### 4. Public Transport Safety Scores
- 6 seeded transport routes with safety data
- Safety scores (0-10) with color coding (red/yellow/green)
- Detailed metrics: lighting, crowd density, CCTV availability
- Best travel times and warning alerts
- Start journey from any route

### 5. AI Safe Navigation (Walking)
- Enter destination for AI analysis
- Gemini AI generates 3 route options:
  - Fastest route
  - Safest route (recommended)
  - Balanced route
- Safety scores (0-100) with descriptions and warnings
- Start navigation on selected route

### 6. Incident Reporting
- 6 incident types: Harassment, Route Deviation, Unsafe Area, Stalking, Poor Lighting, Other
- Description field with auto-attached location
- Reports feed into safety scoring system

### 7. Trusted Contacts
- Add up to 3 emergency contacts (name + phone)
- Priority-based ordering
- Contacts receive simulated SOS alerts

### 8. Trip History
- Full trip log with mode, origin, destination, timestamps
- Safety ratings and trip status
- Pull-to-refresh functionality

### 9. Profile & Settings
- User info display
- Quick navigation to contacts and trips
- Safety tips
- Logout functionality

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/profile | Get user profile |
| GET/POST/DELETE | /api/contacts | Trusted contacts CRUD |
| POST | /api/trips/start | Start a trip |
| POST | /api/trips/{id}/end | End a trip |
| GET | /api/trips | List trips |
| POST | /api/reports | Create incident report |
| GET | /api/safety-scores/transport | Get transport safety scores |
| POST | /api/ai/analyze-route | AI route safety analysis |
| POST | /api/alerts/sos | Trigger SOS alert |

## MOCKED Integrations
- **Twilio SMS**: Simulated with in-app alerts (no real SMS sent)
- **Phone Calls**: Simulated with alert dialogs
- **Maps on Web**: Styled fallback grid with markers (native MapView via react-native-maps on Expo Go)
- **Push Notifications**: Local notifications implemented via expo-notifications (remote push requires EAS build)

## New Components (Enhancement v2)
- **SafeMap**: Cross-platform map component (native: react-native-maps, web: styled grid fallback)
- **PlaceAutocomplete**: Real-time location search using Photon/Komoot API (free, no key needed)
- **LocationService**: Foreground + background GPS tracking via expo-location
- **NotificationService**: Local push notifications via expo-notifications

## Permissions Configured
- **Android**: ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE, VIBRATE
- **iOS**: NSLocationAlwaysAndWhenInUseUsageDescription, UIBackgroundModes (location, fetch)

## Database Collections
- users, trusted_contacts, trips, location_trail, reports, safety_scores, alerts

## Design System
- **Theme**: Dark mode only
- **Background**: Navy #0A0F2C
- **Accent**: Electric Teal #00D4AA
- **Danger**: Red #FF3B30
- **Typography**: System font, weights 400-900
- **Cards**: 16px border radius
- **Touch targets**: 44px minimum

## Future Enhancements
- Real Twilio SMS integration for live alerts
- Google Maps integration for visual route display
- Background location tracking
- Accelerometer-based safety monitoring
- Audio recording for evidence collection
- Push notifications for real-time alerts
- Community safety heat maps
- Premium subscription for advanced features
