# NEXUS GIET 🚀
### The Intelligent Campus Management Ecosystem

**NEXUS GIET** is a next-generation unified platform designed for GIET University. It integrates critical campus operations into a single, high-performance dashboard with a focus on real-time data, security, and immersive user experiences.

---

## 🛰️ Core Modules

### 1. Advanced CCTV Surveillance (SOC v4.6)
*   **Real-time Monitoring**: High-performance HLS/RTSP stream integration via **Surveillance SOC**.
*   **Tactical Layouts**: Toggle between Grid and **Cinema Mode** (Focus + Sidebar).
*   **Surveillance Suite**: Digital Zoom, Night Vision (IR) filters, and live REC timestamps.
*   **AI Motion Alerts**: Real-time broadcast sync across all connected terminals.

### 2. Smart Attendance & Student IQ
*   **Biometric-Ready**: Ultra-fast attendance logging with PostgreSQL integrity guards.
*   **Bulk Registration**: High-performance CSV-based student enrollment engine.
*   **Data Integrity**: Automated conflict resolution and real-time attendance sync.

### 3. Financial Intelligence (Finance Bridge)
*   **Secure Tracking**: End-to-end financial monitoring for institutional transactions.
*   **Real-time Sync**: Instant updates to financial states with restricted Faculty/Admin access.

### 4. Academic Results Engine (SBTET/Class Results)
*   **Results Portal**: Automated processing and visualization of SBTET and internal class results.
*   **Dynamic Search**: High-speed filtering by PIN, Semester, and Subject.

### 5. Secure Auth & Multi-Tier Access
*   **Triple-Tier Security**: Granular RBAC for Students, Faculty, and Administrators.
*   **Advanced MFA**: Multi-Factor Authentication (OTP/TOTP) setup for faculty and admin roles.
*   **Postgres RLS**: Military-grade Row Level Security implementation.

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite (Ultra-fast HMR)
- **Styling**: Tailwind CSS & Vanilla CSS (Fluid Glassmorphism UI)
- **Backend/DB**: Supabase (PostgreSQL with Realtime Broadcast)
- **Video Engine**: HLS.js (Patched for absolute cross-browser stability)
- **Animations**: Framer Motion (Smooth tactical transitions)
- **Icons**: Lucide React

---

## 🏁 Getting Started

1.  **Clone & Install**:
    ```bash
    npm install
    ```
2.  **Environment Setup**:
    Configure your `.env` with Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_url
    VITE_SUPABASE_ANON_KEY=your_key
    ```
3.  **Launch SOC Terminal**:
    ```bash
    npm run dev
    ```

---

## 📑 Project Continuity
All project milestones, architectural designs, and verification logs are maintained in the `brain/` directory for full continuity and phase-tracking.
