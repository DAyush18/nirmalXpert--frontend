# NirmanXpert

- Dealer / Supplier flow for inventory management, order handling, bids, and verification
- Customer flow for discovering materials, comparing offers, and placing purchase requests

This project is currently in active development, and more screens and features will be added soon.

## Overview

The app is designed to connect customers and suppliers in the construction ecosystem by enabling:

- material discovery and supplier browsing
- transparent pricing and comparison
- dealer inventory management
- order and trip/rider coordination
- approval-based onboarding and business verification
- secure phone OTP and Google authentication

## Core Features

### Customer experience

- onboarding and role-based access
- sign in with phone number or Google account
- browse construction materials and supplier profiles
- compare offers and prices
- track orders and profile details

### Dealer experience

- business dashboard with performance metrics
- supplier onboarding and verification workflows
- inventory list, add-product, and edit-product flows
- order management and status tracking
- rider assignment and delivery coordination
- active bid tracking and market updates

### Authentication and flows

- OTP phone verification
- Google sign-in support
- role selection for new users
- secure session handling with access/refresh tokens
- route guards and onboarding states for verified and pending accounts

## Tech Stack

- Expo SDK 57
- React Native 0.86
- TypeScript
- Expo Router
- Zustand
- Axios
- Firebase Auth
- NativeWind
- AsyncStorage and SecureStore

## Project Structure

```text
NX-demo-v1/
├── src/
│   ├── app/                 # Expo Router screens and route groups
│   │   ├── (auth)/          # authentication screens
│   │   ├── customer/        # customer journey screens
│   │   ├── dealer/          # dealer journey screens
│   │   └── index.tsx        # welcome screen and app entry
│   ├── api/                 # API clients and service wrappers
│   ├── components/          # reusable UI components
│   ├── constants/           # app configuration
│   ├── lib/                 # auth, formatting, helpers, utilities
│   ├── store/               # Zustand stores
│   ├── types/               # TypeScript types
│   └── ...
├── assets/                  # app assets
├── app.json                 # Expo app configuration
├── package.json             # dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── metro.config.js          # Metro bundler config
├── eslint.config.js         # ESLint config
├── README.md                # project documentation
├── android/                 # Android native project
├── ios/                     # iOS native project (generated when needed)
├── LICENSE
├── .env                     # local environment variables
├── .gitignore
└── node_modules/
```

## Included Screens and Flows

### Authentication and onboarding

- Welcome screen
- Phone login
- OTP verification
- Role selection
- Customer onboarding
- Dealer onboarding
- Verification pending and rejected states

### Dealer screens

- Dealer dashboard
- Inventory overview
- Add product
- Edit product
- Orders list and detail pages
- Rider assignment flow
- Dealer profile

### Customer screens

- Customer onboarding
- Customer home
- Customer profile

## Getting Started

### Prerequisites

- Node.js 20+
- npm or bun
- Expo-compatible environment
- Android Studio or iOS simulator for native testing

### Install dependencies

```bash
npm install
```

### Start the app

```bash
npm start
```

Then select a run target:

- Android emulator
- iOS simulator
- Expo Go
- web preview

### Run platform-specific commands

```bash
npm run android
npm run ios
npm run web
```

## Environment Variables

Create a `.env` file in the project root with the required Expo public variables:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
```

These values are used for backend API access and Google/Firebase authentication.

## Available Scripts

```bash
npm start        # start Expo dev server
npm run android  # run Android app
npm run ios      # run iOS app
npm run web      # run web version
npm run lint     # run lint checks
```

## Development Notes

- The app uses file-based routing via Expo Router.
- State management is handled with Zustand.
- API calls are centralized under `src/api`.
- The app is structured around role-based flows and onboarding states.

## Roadmap

More features and screens will be added soon, including:

- expanded product discovery and advanced filters
- richer customer purchase and checkout flow
- stronger bidding and negotiation interactions
- push notifications and messaging
- analytics and reporting improvements
- more polished backend integration and error handling
- improved UX and mobile responsiveness

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Status

This application is a working demo/prototype with a growing feature set. The foundation is already in place for a full-scale construction marketplace, and the user experience and screens are actively expanding.
