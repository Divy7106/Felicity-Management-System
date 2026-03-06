# Felicity Event Management System

A centralized event management platform for college fests, built using the MERN stack. The system supports three user roles — **Participant**, **Organizer**, and **Admin** — enabling seamless event creation, registration, team management, attendance tracking, and real-time communication.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Libraries & Frameworks Used](#libraries--frameworks-used)
3. [Advanced Features Implemented](#advanced-features-implemented)
4. [Assumptions](#assumptions)
5. [Setup & Installation](#setup--installation)
6. [Environment Variables](#environment-variables)
7. [Deployment](#deployment)

---

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React 19 + Vite 7 + Tailwind CSS 4 |
| Backend    | Node.js + Express 5                 |
| Database   | MongoDB (Mongoose 9 ODM)            |
| Auth       | JWT (HS512) + bcrypt                |
| Real-time  | Socket.IO 4.8                       |
| Deployment | Vercel (frontend) + Render (backend) + MongoDB Atlas |

---

## Libraries & Frameworks Used

### Backend

| Library         | Version | Justification                                                                                                                                                    |
| --------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **express**     | 5.x     | Industry-standard Node.js web framework for building REST APIs. Version 5 was chosen for improved async error handling and modern routing capabilities.           |
| **mongoose**    | 9.x     | MongoDB ODM that provides schema validation, discriminator-based inheritance (used for User/Event/Registration subtypes), and middleware hooks for data integrity. |
| **jsonwebtoken**| 9.x     | Generates and verifies JWT tokens (HS512 algorithm) for stateless authentication across all protected routes.                                                    |
| **bcrypt**      | 6.x     | Securely hashes passwords using adaptive cost factor (configurable salt rounds via environment variable) — ensures no plaintext password storage.                 |
| **cookie-parser**| 1.x    | Parses `sessionId` cookies for dual authentication support (cookies for same-origin, Bearer header for cross-origin requests).                                    |
| **cors**        | 2.x     | Enables Cross-Origin Resource Sharing between the frontend (Vercel) and backend (Render) domains with credential support.                                        |
| **dotenv**      | 17.x   | Loads environment variables from `.env` file, keeping secrets (DB URI, JWT secret, SMTP credentials) out of source code.                                         |
| **socket.io**   | 4.8     | WebSocket server for real-time bidirectional communication — powers the Team Chat feature with rooms, typing indicators, and online presence.                     |
| **multer**      | 2.x     | Handles multipart/form-data file uploads (event images, registration form files, chat attachments) using in-memory storage for MongoDB persistence.              |
| **nodemailer**  | 8.x     | Sends transactional emails via Gmail SMTP — registration confirmations, tickets with QR codes, team invitations, and password reset notifications.               |
| **qrcode**      | 1.5     | Generates QR codes as base64 data URLs server-side, embedded in tickets and registration confirmation emails for attendance scanning.                             |
| **fuse.js**     | 7.x     | Client-side fuzzy search library used on the backend for Browse Events — supports partial matching, weighted fields (event name, organizer, tags), and typo tolerance. |
| **nodemon**     | 3.x     | Development dependency — auto-restarts the server on file changes for faster development iteration.                                                              |

### Frontend

| Library              | Version | Justification                                                                                                                                    |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **react**            | 19.x   | Core UI library chosen for its component-based architecture, hooks API, and large ecosystem. v19 provides improved performance and concurrent features. |
| **react-dom**        | 19.x   | React renderer for the browser DOM, paired with React 19.                                                                                        |
| **react-router-dom** | 7.x    | Declarative routing for the SPA — supports nested routes, route guards (role-based access control), and programmatic navigation.                  |
| **axios**            | 1.13   | HTTP client with request/response interceptors for automatic JWT token attachment, base URL configuration, and consistent error handling.         |
| **tailwindcss**      | 4.x    | Utility-first CSS framework enabling rapid, consistent UI development without writing custom CSS files. Chosen for its flexibility and small production bundle size. |
| **@tailwindcss/vite**| 4.x    | Official Tailwind CSS plugin for Vite — provides optimized JIT compilation and hot module replacement during development.                        |
| **socket.io-client** | 4.8    | WebSocket client paired with the backend Socket.IO server — powers real-time team chat with event-based messaging.                                |
| **jsqr**             | 1.4    | Pure JavaScript QR code decoder — used as a fallback when the browser's native `BarcodeDetector` API is unavailable, enabling cross-browser QR scanning from camera frames. |
| **qs**               | 6.x    | URL-encoded form data serializer — used for encoding login/signup request bodies in `application/x-www-form-urlencoded` format.                   |
| **vite**             | 7.x    | Next-generation frontend build tool — chosen for its fast HMR, native ESM support, and optimized production builds over alternatives like CRA.    |
| **eslint**           | 9.x    | JavaScript linter for code quality enforcement with React-specific plugins (`react-hooks`, `react-refresh`).                                      |

---

## Advanced Features Implemented

### Tier A: Core Advanced Features (2 selected — 16 Marks)

#### 1. Hackathon Team Registration (A1) — 8 Marks

**Justification:** Team-based events are a core part of any college fest (hackathons, competitive coding, case studies). Supporting team formation with invite workflows makes the platform practically usable for real fest scenarios rather than being limited to individual registrations.

**Design Choices & Implementation:**
- Events can be configured with `allowTeamRegistration: true`, `minTeamSize`, and `maxTeamSize` at creation time.
- A `TeamRegistration` schema extends the base `Registration` model using Mongoose discriminators, adding `teamName`, `teamLeaderId`, `teamMembers[]` (with per-member status tracking: pending/accepted/declined), and `teamStatus` (forming/complete/incomplete).
- **Flow:** Team leader creates a team → specifies member emails → members receive email invitations → each member accepts/declines from their dashboard → when all members accept and team reaches required size, the status transitions to `complete` → individual `Registration` records with unique tickets and QR codes are automatically generated for each team member → confirmation emails sent.
- Eligibility checks (IIITH/Non-IIITH) are enforced per member at invite time.
- Duplicate registration prevention: a participant cannot be on multiple teams for the same event.
- Team cancellation cascades: cancelling the team removes all member registrations.

**Technical Decisions:**
- Used Mongoose discriminators over separate collections to maintain a unified registration query interface.
- Team status is derived from member acceptance states rather than stored redundantly, ensuring consistency.
- Email invitations include the team name and event details for context.

---

#### 2. QR Scanner & Attendance Tracking (A3) — 8 Marks

**Justification:** QR-based attendance is essential for large-scale fest events where manual roll calls are infeasible. This feature closes the loop from registration → ticket → venue check-in, giving organizers real-time attendance visibility.

**Design Choices & Implementation:**
- **QR Scanning (3 modes):**
  - **Live camera scanning** using the browser's `BarcodeDetector` API with automatic fallback to the `jsQR` library for unsupported browsers.
  - **QR image file upload** — organizers can scan a screenshot/photo of a QR code.
  - **Manual ticket ID entry** — fallback for damaged or unreadable QR codes.
- **Attendance Dashboard:** Real-time view of scanned vs. not-yet-scanned participants with counts and percentages.
- **Audit Logging:** Every attendance action is recorded in an `AttendanceLog` collection with: action type (scan/manual-mark/manual-unmark), performer ID, scan method, timestamp, and reason (for manual overrides).
- **Duplicate Detection:** Re-scanning an already-scanned ticket is rejected with an appropriate message.
- **CSV Export:** Organizers can export full attendance reports for post-event analysis.
- **Manual Override:** For exceptional cases where QR scanning fails, organizers can manually mark/unmark attendance with a mandatory reason field for accountability.
- **3-second cooldown** between scans on the frontend to prevent accidental double-scans.

**Technical Decisions:**
- Used `BarcodeDetector` API first (native, fast) with `jsQR` as fallback rather than relying solely on a library, improving performance on supported browsers.
- Attendance logs are stored in a separate collection (not embedded in registrations) to maintain an immutable audit trail.
- Event date validation ensures scanning is only allowed during or after the event start time.

---

### Tier B: Real-time & Communication Features (2 selected — 12 Marks)

#### 1. Organizer Password Reset Workflow (B2) — 6 Marks

**Justification:** Since organizer accounts are provisioned by the Admin (no self-registration), organizers cannot reset their own passwords through a typical "forgot password" flow. A request-based workflow through the Admin is the natural and secure approach for this role hierarchy.

**Design Choices & Implementation:**
- **Organizer side:** Organizers verify their current password and submit a reset request from their Profile page. A `PasswordReset` record is created with status `pending`. The UI shows the current request status.
- **Admin side:** A dedicated "Password Reset Requests" page displays all pending and historical requests with organizer name, email, date, and status. Admin can:
  - **Approve:** System generates a new secure password, updates the organizer's credentials, and sends the new password to the organizer's contact email.
  - **Reject:** Sends a rejection notification email to the organizer.
- **Schema:** `PasswordReset` model with `organizerId`, `organizerName`, `organizerEmail`, `contactEmail`, `status` (pending/completed/rejected), and `completedAt`.
- Status tracking prevents duplicate pending requests from the same organizer.

**Technical Decisions:**
- The new password is auto-generated (not chosen by admin) for security — the admin never knows the final password since it's emailed directly.
- Verification of current password before submitting a request prevents unauthorized reset requests if a session is hijacked.

---

#### 2. Team Chat (B3) — 6 Marks

**Justification:** Team formation for hackathons requires coordination among members who may not know each other. A built-in chat eliminates the need for external communication tools (WhatsApp groups, Discord servers) and keeps all team discussion within the platform context.

**Design Choices & Implementation:**
- **Real-time messaging** via Socket.IO with JWT-authenticated WebSocket connections.
- **Room-based architecture:** Each team has its own chat room (keyed by `teamRegistrationId`). Only verified team members can join.
- **Features:**
  - Real-time message delivery with instant UI updates
  - Full message history loaded on room join
  - **Online status indicators** — tracks which team members are currently in the chat
  - **Typing indicators** — shows when a team member is composing a message
  - **Unread message counts** — localStorage-based last-read timestamp tracking per team, with unread badges in the teams list
  - **File sharing** — PDF uploads via REST API, file reference sent through socket, files stored in MongoDB
  - **System messages** — automatic messages for team events (member joined, file shared)
- **Chat disabled when:** team is cancelled, not all members have accepted, or the event has ended.

**Technical Decisions:**
- Socket.IO over raw WebSockets for automatic reconnection, room management, and event-based messaging patterns.
- File uploads go through REST (multer) rather than WebSocket to handle large binary data properly — socket emits only the file reference.
- Chat messages are persisted in MongoDB (`ChatMessage` collection) so history is available across sessions, not just in-memory.
- Membership verification happens both at socket connection (JWT) and room join (database check) for defense in depth.

---

### Tier C: Integration & Enhancement Features (1 selected — 2 Marks)

#### 1. Add to Calendar Integration (C2) — 2 Marks

**Justification:** Participants register for multiple events across several days during a fest. Calendar integration ensures they don't miss events by syncing schedules with their existing calendar apps — a simple feature with high practical value.

**Design Choices & Implementation:**
- **`.ics` file generation:** Backend generates RFC 5545 compliant iCalendar files with:
  - `VEVENT` with event name, description, start/end times, organizer info
  - `VALARM` reminders: 30 minutes before and 1 day before the event
  - Support for both single-event and batch export (multiple events in one `.ics` file)
- **Direct calendar links:** Frontend generates deep links for:
  - **Google Calendar** (`calendar.google.com/calendar/render`)
  - **Microsoft Outlook** (`outlook.live.com/calendar/action/compose`)
- Calendar export buttons are available on both the Event Details page and the Participant Dashboard (upcoming events section).

**Technical Decisions:**
- `.ics` is the universal standard supported by all major calendar apps (Google Calendar, Apple Calendar, Outlook, etc.), making it the most portable choice.
- Reminders are set at two intervals (30 min and 1 day) to balance between advance notice and last-minute prompts.
- Batch export allows downloading the entire fest schedule at once rather than event-by-event.

---

## Prerequisites

| Requirement | Version | Notes |
| ----------- | ------- | ----- |
| **Node.js** | ≥ 18.x | Required for both frontend and backend |
| **npm** | ≥ 9.x | Comes with Node.js |
| **MongoDB** | ≥ 6.x | Local install **or** a MongoDB Atlas connection string |
| **Git** | any | To clone the repository |
| **Gmail Account** | — | Needed for transactional emails (requires a [Google App Password](https://support.google.com/accounts/answer/185833)) |

---

## Setup & Installation


### 1. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory (see [Environment Variables](#environment-variables) below, or copy from `.env.example`):

```bash
cp .env.example .env
# Edit .env and fill in actual values
```

Start the backend server:

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

### 2. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory

Start the frontend dev server:

```bash
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

### 3. Seed the Admin account

The first Admin user must be created via the backend CLI script. Make sure the backend `.env` is configured and MongoDB is running:

```bash
cd backend
node createAdmin.js
```

You will be prompted to enter an admin email and password.

### 4. Access the application

| Service  | URL |
| -------- | --- |
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3000 |

---

## Environment Variables

Environment variables are kept in `.env` files (never committed to git). See the `.env.example` files in each directory for the full list with descriptions.

### Backend (`backend/.env`)

| Variable | Description |
| -------- | ----------- |
| `PORT` | Port the backend server listens on (default: `3000`) |
| `NODE_ENV` | Environment mode — `development` or `production` |
| `BASE_URL` | Public URL of the backend (used in emails/links) |
| `FRONTEND_BASE_URL` | Public URL of the frontend (used for CORS and email links) |
| `MONGO_URL` | MongoDB connection string (local or Atlas) |
| `SECRET_KEY` | Secret key used to sign JWT tokens — use a long random hex string |
| `JWT_EXPIRY` | JWT token expiration duration (e.g. `7d`, `24h`) |
| `JWT_ALGORITHM` | JWT signing algorithm (default: `HS512`) |
| `COOKIE_SECURITY` | Set to `true` in production (HTTPS), `false` in development |
| `COOKIE_SAME_SITE` | Cookie SameSite policy — `lax` for dev, `none` for cross-origin prod |
| `COOKIE_MAX_AGE` | Cookie max age in milliseconds (default: `604800000` = 7 days) |
| `BCRYPT_SALT_ROUNDS` | Number of bcrypt hashing rounds (default: `10`) |
| `GOOGLE_APP_PASSWORD` | Gmail App Password for sending transactional emails |
| `SYSTEM_EMAIL` | Gmail address used as the "from" address for system emails |
| `ORGANIZER_EMAIL_DOMAIN` | Email domain suffix auto-assigned to organizer accounts (default: `@felicity.local`) |

### Frontend (`frontend/.env`)

| Variable | Description |
| -------- | ----------- |
| `VITE_BASE_BACKEND_URL` | URL of the backend API server (e.g. `http://localhost:3000`) |
| `VITE_API_BASE_PATH` | API path prefix (default: `/api`) |

---

## Deployment

| Service  | Platform |
| -------- | -------- |
| Frontend | Vercel |
| Backend  | Render |
| Database | MongoDB Atlas |

Refer to `deployment.txt` for live URLs.

---

## Assumptions

1. **No real payment gateway:** The system simulates payments — registrations and merchandise purchases are marked as `paid` immediately upon submission. In a production environment, this would be replaced with an actual payment gateway (Razorpay, Stripe, etc.). This assumption was made because integrating a payment gateway was not part of the assignment requirements and would require merchant accounts.

2. **File storage in MongoDB:** All uploaded files (event images, registration form attachments, chat files) are stored as binary `Buffer` data in a MongoDB `File` collection, served via `/api/files/:id`. This was chosen over cloud storage (S3, Cloudinary) to keep the system self-contained without external storage dependencies. For production scale, this would need to be migrated to object storage.

3. **Organizer emails are auto-generated:** When the Admin creates an organizer, the login email is auto-generated as `organizerName.toLowerCase().replace(spaces, ".") + @felicity.local` (domain configurable via `ORGANIZER_EMAIL_DOMAIN` env var). This is because organizers don't self-register; the system creates credentials on their behalf.

4. **Admin is seeded via backend:** The first Admin account is created through a backend endpoint (`/api/auth/create-admin`) rather than through a UI. The admin email and password are defined in environment variables. This follows the assignment requirement that Admin has no UI registration.

5. **Single role per user:** Each user has exactly one role (Participant, Organizer, or Admin) that cannot be changed. This is enforced at the schema level using Mongoose discriminators — a user document's type is immutable after creation.

6. **IIITH email domain validation:** IIITH participants must register with an email from one of the allowed institutional domains (`student.iiit.ac.in`, `research.iiit.ac.in`, `alumni.iiit.ac.in`, etc.). This validation is enforced at both the frontend (form validation) and backend (schema validation).

7. **QR codes are embedded in emails:** Rather than linking to an external URL, QR code images are generated as base64 data URLs and embedded directly in confirmation emails as CID (Content-ID) attachments. This ensures tickets are viewable offline and in email clients that block external images.

8. **Merchandise purchase equals registration:** Buying merchandise is treated as a registration event — it creates a `Registration` record with merchandise selections, rather than a separate order/cart model. This simplifies the data model while meeting the assignment requirement that "Purchase implies registration."

9. **Event form locking after first registration:** Once the first participant registers for an event, the custom registration form fields are locked (`formLocked: true`) and cannot be modified. This prevents data inconsistency where different participants would have submitted different form schemas.

10. **Dual authentication support:** The system supports both cookie-based (`sessionId` cookie) and header-based (`Authorization: Bearer <token>`) authentication simultaneously. This allows the frontend to work in both same-origin (development proxy) and cross-origin (deployed) configurations without code changes.

11. **Trending events are calculated over 24 hours:** The "Trending" section on Browse Events shows the top 5 events by registration count in the last 24 hours. This time window was chosen as a reasonable approximation for "trending" during a multi-day fest.

12. **Draft events are not visible to participants:** Events in draft state are only visible to the organizer who created them. They must be published before appearing in the participant's Browse Events page.

13. **Team chat is restricted to complete teams:** The team chat feature is only accessible after all invited team members have accepted their invitations and the team status is `complete`. This prevents partial teams from using chat before formation is finalized.

14. **Discord webhook is optional:** The Discord webhook URL on the organizer profile is an optional field. If provided, new event publications automatically post an embed to the configured Discord channel. If not set, events are created without Discord notification.

15. **Session persistence across browser restarts:** JWT tokens are stored in HTTP-only cookies with a configurable expiration (default: session duration defined in env). Sessions persist across browser restarts as long as the token hasn't expired and the user hasn't explicitly logged out.