# SuperTeam India Events Website

A event creation website for superteam India. Now discover events acorss India hosted and organized by superteam

[SuperTeam India website]

## Features

- **Interactive India Map**: Discover events across India with an interactive map
- **Event Management**: Create, edit, and manage both online and offline events
- **Community Support**: Create and join communities to organize group events
- **QR Code Ticketing**: Generate and scan QR codes for event check-ins
- **Recurring Events**: Set up daily, weekly, or monthly recurring events
- **Notifications**: Real-time notifications for event updates and registrations

## Tech Stack

- React 18
- TypeScript
- Vite
- Firebase (Authentication, Firestore, Storage)
- Mapbox GL
- Tailwind CSS
- Shadcn UI Components

## Installation

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm or yarn or bun
- Firebase account
- Mapbox account

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/event-horizon-india.git
   cd event-horizon-india
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   
   # Mapbox API Key
   VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
   ```

4. Set up Firebase:
   - Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Authentication (Google provider)
   - Create a Firestore database
   - Set up Firebase Storage
   - Copy your Firebase config values to the `.env` file

5. Set up Mapbox:
   - Create a Mapbox account at [mapbox.com](https://mapbox.com)
   - Generate an access token
   - Copy your Mapbox access token to the `.env` file

### Firebase Security Rules

Deploy the security rules to Firebase:

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Development

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

The application will be available at `http://localhost:5173`.

## Building for Production

```bash
npm run build
# or
yarn build
# or
bun run build
```

The build output will be in the `dist` directory.

## Deployment

The application can be deployed to Firebase Hosting:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase Hosting:
   ```bash
   firebase init hosting
   ```

4. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```

## Project Structure

```
event-horizon-india/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   └── ui/          # UI components (shadcn)
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and libraries
│   └── pages/           # Page components
├── .env                 # Environment variables (create this)
├── .gitignore           # Git ignore file
├── firestore.rules      # Firestore security rules
├── package.json         # Project dependencies
├── storage.rules        # Firebase storage rules
├── tailwind.config.ts   # Tailwind CSS configuration
└── vite.config.ts       # Vite configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [Mapbox GL](https://www.mapbox.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Vite](https://vitejs.dev/)
