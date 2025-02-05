# Exponential Bot

A full-stack application for managing insurance leads, appointments, and communications across multiple channels (Telegram, SMS, Voice calls).

## System Architecture

The system consists of two main parts:
1. Frontend (React + Vite)
2. Backend (Node.js + Express)

### Key Features
- Multi-channel communication (Telegram, SMS via SlickText, Voice calls via Twilio)
- AI-powered responses using Claude 3.5 Sonnet
- Appointment scheduling and management
- Admin approval workflow for AI responses
- Automated reminders and notifications

## Prerequisites

- Node.js (v18+)
- MongoDB
- API Keys for:
  - Telegram Bot
  - Anthropic Claude
  - Twilio
  - SlickText

## Installation

### Backend Setup

1. Navigate to backend directory and install dependencies:
```bash
cd backend
npm install
```

2. Create a `.env` file with the following variables:
```
MONGODB_URI=your_mongodb_connection_string
ANTHROPIC_API_KEY=your_claude_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ADMIN_TELEGRAM_ID=your_admin_telegram_id
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_CALLER_NUMBER=your_twilio_number
FORWARD_NUMBER=your_forwarding_number
BASE_URL=your_base_url
```

3. Start the backend server:
```bash
node server.js
```

### Frontend Setup

1. Navigate to frontend directory and install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Project Structure

### Backend

- `server.js`: Main entry point and Express server setup
- `mainAppointment.js`: Appointment scheduling system
- `/jobs/`: Contains various service integrations
  - `/telegram/`: Telegram bot handlers
  - `/claude/`: Claude AI integration
  - `/twilio/`: Voice call handling
  - `/slicktext/`: SMS handling
  - `/appointments/`: Appointment management
- `/models/`: MongoDB schemas
- `/controllers/`: Request handlers

### Frontend

Currently a basic React + Vite setup with potential for future development.

## Key Workflows

### 1. Message Handling

When a message is received (via Telegram or SMS):
1. Message is saved to the lead's conversation history
2. Claude AI generates a response
3. Response is sent to admin for approval
4. Upon approval, response is sent to the user

### 2. Appointment Management

The system automatically manages appointments through two main components:

1. **Main Appointment Service** (`mainAppointment.js`):
   - Runs continuously in the background
   - Checks all leads for new appointments every 10 minutes
   - Connects to MongoDB and initializes the appointment system
   - Start with:
   ```bash
   node mainAppointment.js
   ```

2. **Appointment Scheduler** (`jobs/appointments/scheduleAppointments.js`):
   - Monitors appointments every minute for due reminders
   - When an appointment is due:
     - Sends notifications to both admin and user
     - Initiates automated calls
     - Marks appointments as completed
   - Handles timezone conversions automatically
   - Pins important appointment notifications in admin chat

To run the complete appointment system:
```bash
cd backend
node mainAppointment.js
```

## Development Notes

1. The frontend is currently minimal and can be expanded based on requirements.

2. The backend uses environment variables extensively for configuration - ensure all required variables are set.

3. The system uses MongoDB for persistence with two main models:
   - Lead: Stores user information and conversation history
   - Appointment: Manages scheduled appointments

4. The Claude AI integration is configured to handle insurance-related queries and appointment scheduling.

## Testing

Currently, the test setup is minimal. You can add tests by:
1. Adding test scripts to package.json
2. Creating test files for each component
3. Running `npm test`

## Deployment

1. Backend:
   - Deploy to a Node.js hosting service
   - Ensure environment variables are configured
   - Set up MongoDB instance
   - Configure webhook URLs for Telegram and Twilio

2. Frontend:
   - Build using `npm run build`
   - Deploy static files to web hosting service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

This project is proprietary and confidential.
```
