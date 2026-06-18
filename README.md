# TrustShield AI – Privacy-First Identity Trust Framework
### Developed for Bank of Baroda Hackathon 2026

Traditional authentication systems verify users only at the login boundary, leaving systems exposed to session hijacking, insider threats, privilege abuse, and credential compromises during active sessions. 

**TrustShield AI** is an enterprise-grade Identity Trust Framework that continuously evaluates the trustworthiness of active sessions (customers, branch employees, and administrators) in real time. Using User and Entity Behavior Analytics (UEBA), it calculates a dynamic risk score for every user action. The system applies adaptive security policies, triggering step-up MFA (OTP/Biometrics) or terminating the session and locking accounts automatically when threats are detected.

---

## 🏗️ System Architecture

```
Banking Channels (Internet Banking, Branch Portal, ATM)
      │
      ▼
Backend API Gateway (Express.js, Security Filters, JWT, RBAC)
      │
      ├─► Activity Logs ──► [PostgreSQL Database]
      │
      ├─► (Telemetry payload)
      ▼
Python ML Service (FastAPI Server)
      │
      ├─► 1. Unsupervised Anomaly Detection (Isolation Forest)
      ├─► 2. Supervised Threat Classifier (XGBoost)
      ├─► 3. Explainable AI Engine (SHAP values)
      │
      ▼
Adaptive Policy Decision
      ├─► < 40%   : ALLOW (Proceed)
      ├─► 40-70%  : CHALLENGE (Biometric Scan / OTP)
      └─► > 70%   : TERMINATE & LOCK (Session terminated, Account locked, SOC Incident generated)
```

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion
*   **Backend Core**: Node.js, Express.js, JWT, pg-pool (PostgreSQL client)
*   **AI/ML Service**: Python 3.10, FastAPI, Scikit-Learn (Isolation Forest), XGBoost, SHAP, Pandas, NumPy
*   **Database & Cache**: PostgreSQL (v15), Redis (mocked fallback in memory)
*   **Deployment**: Docker, Docker Compose

---

## 📂 Project Folder Structure

```
├── backend/                  # Node.js Core API Gateway
│   ├── src/
│   │   ├── config/db.ts      # PostgreSQL connection with memory DB fallback
│   │   ├── controllers/      # Auth, dynamic MFA confirmation controllers
│   │   ├── middleware/       # Auth verification & continuous risk evaluator
│   │   ├── routes/           # Auth, transactions, SOC alerts, admin routers
│   │   └── index.ts          # Main Express server entry point
│   ├── Dockerfile
│   └── package.json
├── ml-service/               # Python AI/ML microservice
│   ├── models/
│   │   ├── anomaly_detector.py # Isolation Forest + XGBoost hybrid scorer
│   │   └── explainer.py      # SHAP tree feature explainer & approximation
│   ├── utils/
│   │   └── feature_engineering.py # Logs mapping to 11-dimensional arrays
│   ├── app.py                # FastAPI endpoints
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # Vite React 19 Frontend
│   ├── src/
│   │   ├── components/       # Developer threat simulator, MFA scan modals
│   │   ├── pages/            # Landing, Login, Customer, Employee, SOC, Admin portals
│   │   ├── App.tsx           # Master routes and Promise-hijacked fetch wrapper
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── tailwind.config.js
│   └── package.json
├── database/
│   ├── schema.sql            # Core SQL tables
│   └── seed.sql              # Pre-seeded database values
├── tests/
│   └── run_tests.py          # Zero-dependency urllib integration tests
└── docker-compose.yml        # Orchestrates the container stack
```

---

## 🚀 Getting Started

### Method 1: Using Docker Compose (Recommended)
You can launch the entire microservices container stack with a single command:

1.  Make sure Docker Desktop is installed and running.
2.  Navigate to the project directory and execute:
    ```bash
    docker-compose up --build
    ```
3.  Access the applications:
    *   **Frontend UI Portal**: `http://localhost:3000`
    *   **Backend Core API**: `http://localhost:5000`
    *   **Python AI Service**: `http://localhost:8000`

---

### Method 2: Manual Standalone Run (Local Fallback)
TrustShield AI has a **High-Reliability Fallback Engine**. If PostgreSQL is not configured, the Node backend will automatically activate an in-memory database with pre-seeded users.

#### 1. Start the Python AI Service:
```bash
cd ml-service
pip install -r requirements.txt
python app.py
```
*(Runs on `http://localhost:8000`)*

#### 2. Start the Express Backend:
```bash
cd backend
npm install
npm run dev
```
*(Runs on `http://localhost:5000`)*

#### 3. Start the React Client:
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:3000`)*

---

## 🧪 Automated Testing

We have built a zero-dependency integration test suite (`tests/run_tests.py`) that executes mock logins, checks endpoints health, and verifies normal vs anomalous risk scoring.

Run the tests:
```bash
python tests/run_tests.py
```

---

## 🛡️ Interactive Demo Walkthrough (For Hackathon Judges)

Once logged in, a **Threat Simulator Console** will float in the bottom-right corner. Toggle these parameters to inject anomalies:

### Scenario 1: Authorized Banking Transfer (Normal)
1.  On the Landing Page, select **Internet Banking** (auto-populates customer `cust_rajesh`).
2.  Log in (Default password: `password123`).
3.  Transfer ₹12,000 to an account.
4.  **Result**: Transaction processes instantly. Risk Index remains < 10%.

### Scenario 2: Suspicious VPN Transfer (MFA step-up challenge)
1.  Open the Threat Simulator, toggle **VPN Usage** to **ON**.
2.  Input a transaction of ₹1,50,000. Click **Transfer**.
3.  **Result**: UI is intercepted by the **Adaptive Trust Challenge** overlay.
4.  The **SHAP threat vector** panel displays: `Vpn Active: +20%`, `Transaction Amount: +15%`.
5.  Perform step-up validation: Choose **SMS OTP** (enter `123456`) or click **Initialize Biometric Scan** (camera aligns face nodes).
6.  **Result**: Once verified, the overlay disappears, and the transaction completes.

### Scenario 3: Workstation Data Export (Insider Threat Alarm)
1.  Log out, select **Employee Portal** (logs in `emp_sunita`).
2.  Slide the data export count to **8,000 records**. Click **Export Customer CSV**.
3.  **Result**: System halts, requesting step-up OTP validation to certify data-access intent due to bulk download.

### Scenario 4: Hardware USB Exfiltration (WORKSTATION SHUTDOWN)
1.  While in the Employee Portal, open the Threat Simulator and toggle **VPN Usage ON**.
2.  On the dashboard, click **Simulate USB Mount** (mimics copying records to a physical drive).
3.  **Result**: System immediately redirects to a **Workstation Terminal Isolated** lockout screen.
4.  The active session is terminated, and the AD account is locked. 
5.  Log in as Security Analyst (`analyst_vikram`) on the **SOC Hub** to view the generated incident, inspect the **SHAP waterfall chart**, and write manual triage logs.

---

## 📡 Sample API Documentation

### 1. Evaluate Behavior
*   **Endpoint**: `POST /evaluate` (ML Service)
*   **Request Payload**:
    ```json
    {
      "hour_of_day": 2,
      "is_weekend": 1,
      "location_changed": 1,
      "device_trusted": 0,
      "failed_login_attempts": 3,
      "transaction_amount": 250000.0,
      "file_downloads_count": 0,
      "usb_connected": 0,
      "vpn_used": 1,
      "role": "Customer",
      "privilege_escalation_attempt": 0
    }
    ```
*   **Response**:
    ```json
    {
      "risk_score": 68.5,
      "decision": "CHALLENGE_MFA",
      "explanation": {
        "base_value": 15.0,
        "risk_score": 68.5,
        "contributions": {
          "hour_of_day": 12.5,
          "failed_login_attempts": 15.0,
          "device_trusted": 20.0,
          "vpn_used": 11.0,
          "location_changed": 10.0
        },
        "engine": "SHAP TreeExplainer"
      }
    }
    ```

### 2. Retrieve SOC Alerts
*   **Endpoint**: `GET /api/soc/alerts` (Backend Core)
*   **Headers**: `Authorization: Bearer <JWT>`
*   **Response**:
    ```json
    [
      {
        "id": 2,
        "user_id": 4,
        "session_id": 2,
        "alert_type": "UNAUTHORIZED_USB_CONNECTION",
        "severity": "Critical",
        "description": "Blocked write attempt to USB storage device SanDisk Cruiser 64GB by Employee Sunita.",
        "status": "Active",
        "created_at": "2026-06-18T12:12:00.000Z"
      }
    ]
    ```

---

## 🏛️ Regulatory Compliance

TrustShield AI conforms with primary banking security regulations:
1.  **Reserve Bank of India (RBI) Cyber Security Framework**: Satisfies requirement for continuous session anomaly tracking, automated isolation (lockout), and multi-factor adaptive step-up controls.
2.  **GDPR & Data Protection Bill (DPDP)**: Features **Privacy-First SHAP explanations**. The AI model explains risk scores using aggregated weight impact parameters, avoiding the recording or exposure of private user telemetry logs or biometrics in text format.
3.  **Audit Logs Integrity**: Creates read-only cryptographic session mappings in the `behavior_logs` table, offering compliance officers an immutable audit trail of actions.
