# Stonevo Project Overview: A to Z Manual for Claude

## 1. Mission Statement
**Stonevo** is a high-end architectural stone gallery and procurement portal. It bridges the gap between institutional curators (Architects) and private clients, providing AI-powered visualization and real-time project management.

---

## 2. Technical Stack
- **Frontend**: React (Vite)
- **Styling**: Vanilla CSS with TailwindCSS utilities (Luxury-focused brand identity).
- **Backend/DB**: Supabase (PostgreSQL + Realtime).
- **Animations**: Framer Motion (Glassmorphism + Smooth Transitions).
- **State Management**: React Context API (`RequirementsContext.jsx`).

---

## 3. Core Architecture & Data Flow

### A. The Gatekeeper: `LeadGate.jsx`
- **Role**: Handles entire entry flow (Phone OTP -> Whitelist Check -> Identity Choice).
- **Identity Selection**: Users MUST choose between "Architect" and "Client."
- **Defensive Shield**: The gate automatically resets `localStorage` if it detects malformed or non-existent UUIDs, preventing site-wide crashes previously caused by "poison pill" data.

### B. The Brain: `RequirementsContext.jsx`
- **Global State**: Manages the current list of selected stones (`activeDraft`).
- **Project Linking**: Handles `activeRoomId`. When an architect "Links" to a client, this context redirects all database queries from the architect's ID to the client's room ID.
- **Persistence**: Automatically syncs current work to the `project_requirements` table in Supabase.

### C. The Dashboard: `Home.jsx`
- **Layout**: Features a high-fidelity stone gallery, AI Chat Assistant, and a header with specialized architect controls.
- **Context Awareness**: Shows different buttons (e.g., "Client Dashboard") depending on the user's role and "Linked" status.

---

## 4. Key Features & Components

### 🏗️ Client Manager (`ClientManager.jsx`)
- **Whitelist Management**: Architects can add/remove client phone numbers.
- **Project Linking (🔗)**: A critical button that "links" the architect's view to a specific client project.

### 💬 Project Chat (`ProjectChat.jsx`)
- **Real-time Sync**: Uses Supabase channels to provide instant messaging between architect and client.
- **Safe-Boot Pattern**: Implements a 1.5-second initialization delay to prevent browser race conditions during heavy gallery loads.

### 📐 Stone Selection Form (`StoneSelectionForm.jsx`)
- **Complexity**: Handles floors, rooms, and individual stone specimens.
- **Sync**: Linked directly to `RequirementsContext` for live saving.

### ✨ AI Visualization (`AIVisualizationModal.jsx`)
- **Logic**: Sends stone metadata and room types to a backend API to generate high-end architectural renders.

---

## 5. Stability Patterns (CRITICAL)
If the site crashes or shows a "Black Screen," check these first:
1. **Safe-Boot Delay**: The chat subscription is delayed by 1500ms to allow the main UI to stabilize.
2. **UUID Verification**: `LeadGate` verifies all `lead_id` strings against a UUID regex before allowing the app to boot.
3. **Error Boundaries**: `ProjectChat` and `Home` are wrapped in defensive logic to catch individual component failures.

---

## 6. Database Schema (Supabase)
- `leads`: All users (Architects/Clients).
- `stones`: Master inventory of available slabs/marbles.
- `project_requirements`: The JSON data structures for each project room.
- `client_whitelist`: Mapping of which Clients are assigned to which Architects.
- `project_messages`: Real-time chat history.

---

## 8. Deployment & Version Control

### 📦 Version Control (Git)
- **Workflow**: Every stable change is committed to Git. This prevents code regression and allows for easy rollbacks if a "Black Screen" crash occurs.
- **Collaboration**: Multiple developers (or AI assistants) can work on separate features without breaking the core stability of the gallery.

### 🚀 Deployment (Vercel)
- **CI/CD Pipeline**: The project is integrated with **Vercel**. Every push to the `main` branch triggers an automatic production build and deployment.
- **Environment Management**: Crucial Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are managed securely via Vercel Environment Variables.
- **Build Command**: `npm run build` (Vite production bundle).
- **Output Directory**: `dist/`

---

## 9. Development Guidelines
- **Premium Aesthetics**: Always prioritize luxury design (Inter font, neutral palettes, subtle 1px borders).
- **Non-Destructive Stability**: Never remove the "Safety Shield" in `RequirementsContext` or `LeadGate`.
- **Role Preservation**: Always pass the `role` prop down from `App.jsx` to ensure UI buttons remain visible.
