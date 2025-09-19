# Comegle Socket Server

A Node.js and TypeScript-based signalling server for the Comegle platform, using Socket.io for real-time communication. This server manages user connections, matchmaking, and room management for anonymous chat based on preferences and topics.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [File Details](#file-details)
- [Development & Usage](#development--usage)

---

## Project Structure

```
Comegle_Socket_Server/
├── package.json
├── package-lock.json
├── tsconfig.json
└── src/
    ├── server.ts
    └── managers/
        ├── UserManager.ts
        └── RoomManager.ts
```

- **package.json / package-lock.json**: Project dependencies and scripts.
- **tsconfig.json**: TypeScript configuration.
- **src/server.ts**: Main entry point, sets up Socket.io server and connection logic.
- **src/managers/UserManager.ts**: Handles user registration, matchmaking, and state.
- **src/managers/RoomManager.ts**: Handles room creation, deletion, and peer assignment.

---

## Setup Instructions

### Prerequisites

- Node.js (>=16.x)
- npm (>=8.x)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AdityaRaj0001/Comegle_Socket_Server.git
   cd Comegle_Socket_Server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

4. **Start the server:**
   - For production:
     ```bash
     npm start
     ```
   - For development (auto-restart on changes):
     ```bash
     npm run dev
     ```

By default, the server runs and exposes Socket.io endpoints with CORS enabled for all origins.

---

## File Details

### package.json

Defines scripts for building, starting, and development (`nodemon` for live reload). Dependencies include `socket.io` and types for TypeScript.

### tsconfig.json

Configures TypeScript to output ES2016-compatible JS, uses CommonJS modules, and places source files under `src/`.

### src/server.ts

- Bootstraps the HTTP and Socket.io servers.
- Handles user connection, registration (general or by topic), joining/leaving rooms, and exits.
- Manages broadcasting of user counts and total counts for all topics (`dsa`, `cp`, `sports`).
- Relies on `UserManager` for user logic and `RoomManager` for room logic.

### src/managers/UserManager.ts

- Defines the `User` interface and manages users in general and topic-based lobbies.
- Handles registration, matchmaking based on state/gender preferences, and queue management.
- Invokes room creation via `RoomManager`.
- Provides utilities for user counting and event handler registration.

### src/managers/RoomManager.ts

- Manages rooms with unique IDs.
- Handles assignment of users to rooms, deletion of rooms on leave or exit, and peer socket lookup.
- Utility functions for room inspection and management.

---

## Development & Usage

- The server is designed to be used as a Socket.io signalling server in a chat/matchmaking context (e.g., for apps like Omegle).
- Users connect, register with preferences, and get matched anonymously based on those preferences (state, gender, topic).
- Supports real-time updates for user counts and room management.

---

## Further Information

- Code search results are limited; for more files or details, explore the repository on [GitHub](https://github.com/AdityaRaj0001/Comegle_Socket_Server).
- For questions or contributions, please open an issue or pull request.
