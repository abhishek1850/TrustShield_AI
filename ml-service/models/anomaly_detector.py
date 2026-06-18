# TrustShield AI - Machine Learning Models
# Bank of Baroda Hackathon 2026

import os
import pickle
import numpy as np
import pandas as pd
try:
    from sklearn.ensemble import IsolationForest
    from xgboost import XGBClassifier
    HAS_ML_LIBRARIES = True
except ImportError:
    print("[WARNING] TrustShield Warning: Scikit-Learn or XGBoost could not be loaded. Activating rule-based fallback model for Python 3.14 compatibility.")
    HAS_ML_LIBRARIES = False

from utils.feature_engineering import FEATURE_NAMES

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
IFOREST_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")
XGB_PATH = os.path.join(MODEL_DIR, "xgboost_model.pkl")

class RiskEvaluatorModel:
    def __init__(self):
        self.iforest = None
        self.xgb = None
        self.load_or_train_models()

    def generate_synthetic_data(self):
        """
        Generates synthetic Bank of Baroda employee and customer behavior data
        to train the baseline Isolation Forest and XGBoost model.
        """
        np.random.seed(42)
        n_samples = 1000

        # Create normal samples (Label 0)
        normal_data = []
        for _ in range(n_samples):
            # Most logins are during office hours (9 AM - 6 PM)
            hour = int(np.random.choice([
                np.random.randint(9, 18), 
                np.random.randint(0, 24)
            ], p=[0.8, 0.2]))
            
            is_weekend = int(np.random.rand() > 0.8)
            location_changed = int(np.random.rand() > 0.95)
            device_trusted = int(np.random.rand() < 0.95)
            failed_logins = int(np.random.choice([0, 1, 2, 3], p=[0.9, 0.07, 0.02, 0.01]))
            
            # Transactions: mostly small, occasional high value
            tx_amount = float(np.random.exponential(scale=10000.0))
            if np.random.rand() > 0.98:
                tx_amount = float(np.random.randint(100000, 500000))
                
            file_downloads = int(np.random.choice([0, 1, 5, 20], p=[0.85, 0.1, 0.04, 0.01]))
            usb_connected = 0  # Employees rarely connect USB storage in normal course
            vpn_used = int(np.random.rand() > 0.9)
            role_type = int(np.random.choice([0, 1, 2, 3, 4, 5], p=[0.6, 0.25, 0.08, 0.03, 0.02, 0.02]))
            privilege_escalation = 0

            normal_data.append([
                hour, is_weekend, location_changed, device_trusted, failed_logins,
                tx_amount, file_downloads, usb_connected, vpn_used, role_type, privilege_escalation, 0
            ])

        # Create anomalous/malicious samples (Label 1)
        anomalous_data = []
        
        # Scenario 1: Insider Threat - mass file download via USB
        for _ in range(50):
            hour = np.random.randint(9, 18)
            is_weekend = 0
            location_changed = 0
            device_trusted = 1
            failed_logins = 0
            tx_amount = 0.0
            file_downloads = np.random.randint(1000, 10000) # downloading massive records
            usb_connected = 1 # copying to USB
            vpn_used = 0
            role_type = np.random.choice([1, 2]) # Employee or BranchManager
            privilege_escalation = np.random.choice([0, 1], p=[0.7, 0.3])
            
            anomalous_data.append([
                hour, is_weekend, location_changed, device_trusted, failed_logins,
                tx_amount, file_downloads, usb_connected, vpn_used, role_type, privilege_escalation, 1
            ])

        # Scenario 2: Account Takeover / External Hacker
        for _ in range(50):
            hour = np.random.choice([np.random.randint(0, 6), np.random.randint(20, 24)]) # midnight
            is_weekend = np.random.choice([0, 1])
            location_changed = 1 # logins from unexpected country/city
            device_trusted = 0 # new device fingerprint
            failed_logins = np.random.randint(3, 8) # brute force indicators
            tx_amount = float(np.random.randint(150000, 1000000)) # high value transfer
            file_downloads = 0
            usb_connected = 0
            vpn_used = 1 # hides behind a VPN
            role_type = 0 # Customer
            privilege_escalation = 0
            
            anomalous_data.append([
                hour, is_weekend, location_changed, device_trusted, failed_logins,
                tx_amount, file_downloads, usb_connected, vpn_used, role_type, privilege_escalation, 1
            ])

        # Scenario 3: Privilege Abuse / Rogue Administrator
        for _ in range(30):
            hour = np.random.randint(0, 24)
            is_weekend = 0
            location_changed = 0
            device_trusted = 1
            failed_logins = 0
            tx_amount = 0.0
            file_downloads = np.random.randint(5, 50)
            usb_connected = 0
            vpn_used = 1
            role_type = np.random.choice([4, 5]) # Admin or Compliance
            privilege_escalation = 1 # attempting unauthorized access
            
            anomalous_data.append([
                hour, is_weekend, location_changed, device_trusted, failed_logins,
                tx_amount, file_downloads, usb_connected, vpn_used, role_type, privilege_escalation, 1
            ])

        all_records = normal_data + anomalous_data
        df = pd.DataFrame(all_records, columns=FEATURE_NAMES + ['label'])
        return df

    def train_models(self):
        if not HAS_ML_LIBRARIES:
            print("TrustShield AI Fallback: Skipping model training due to missing libraries.")
            return
            
        print("TrustShield AI: Generating training dataset...")
        df = self.generate_synthetic_data()
        X = df[FEATURE_NAMES].values
        y = df['label'].values

        print("TrustShield AI: Training Isolation Forest model...")
        X_normal = df[df['label'] == 0][FEATURE_NAMES].values
        self.iforest = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        self.iforest.fit(X_normal)

        print("TrustShield AI: Training XGBoost Classifier...")
        self.xgb = XGBClassifier(
            n_estimators=50,
            max_depth=4,
            learning_rate=0.1,
            objective='binary:logistic',
            random_state=42
        )
        self.xgb.fit(X, y)

        os.makedirs(MODEL_DIR, exist_ok=True)
        with open(IFOREST_PATH, 'wb') as f:
            pickle.dump(self.iforest, f)
        with open(XGB_PATH, 'wb') as f:
            pickle.dump(self.xgb, f)
        print("TrustShield AI: Models trained and successfully saved to disk.")

    def load_or_train_models(self):
        if not HAS_ML_LIBRARIES:
            print("TrustShield AI Fallback: Skipping model loading due to missing libraries. Operating in rule-based baseline mode.")
            return
            
        if os.path.exists(IFOREST_PATH) and os.path.exists(XGB_PATH):
            try:
                with open(IFOREST_PATH, 'rb') as f:
                    self.iforest = pickle.load(f)
                with open(XGB_PATH, 'rb') as f:
                    self.xgb = pickle.load(f)
                print("TrustShield AI: Models loaded successfully from disk.")
            except Exception as e:
                print(f"TrustShield AI: Error loading models: {e}. Retraining...")
                self.train_models()
        else:
            self.train_models()

    def evaluate_risk(self, features: np.ndarray) -> float:
        """
        Combines predictions from Isolation Forest and XGBoost to generate
        a normalized risk score (0 to 100). Falls back to heuristic calculation if libs missing.
        """
        if not HAS_ML_LIBRARIES or self.iforest is None or self.xgb is None:
            # Pure Python Rule-Based Heuristic Scorer
            risk_score = 10.0
            vector = features[0]
            hour = vector[0]
            is_weekend = vector[1]
            location_changed = vector[2]
            device_trusted = vector[3]
            failed_logins = vector[4]
            tx_amount = vector[5]
            downloads = vector[6]
            usb_connected = vector[7]
            vpn_used = vector[8]
            role_type = vector[9]
            privilege_escalation = vector[10]

            if vpn_used: risk_score += 15
            if location_changed: risk_score += 15
            if not device_trusted: risk_score += 30
            if failed_logins > 0: risk_score += failed_logins * 10
            if tx_amount > 500000: risk_score += 40
            elif tx_amount > 100000: risk_score += 10
            if downloads > 1000: risk_score += 45
            elif downloads > 100: risk_score += 20
            if usb_connected: risk_score += 65
            if privilege_escalation: risk_score += 50
            if hour < 7 or hour > 21: risk_score += 10

            return round(float(np.clip(risk_score, 0, 100)), 2)
            
        # 1. Isolation Forest score
        raw_iforest_score = self.iforest.score_samples(features)[0]
        iforest_risk = float(np.clip(( -raw_iforest_score - 0.35) / 0.45 * 100, 0, 100))

        # 2. XGBoost probability
        xgb_proba = float(self.xgb.predict_proba(features)[0][1] * 100)

        # 3. Hybrid Risk Score:
        if xgb_proba > 60:
            final_risk = 0.3 * iforest_risk + 0.7 * xgb_proba
        else:
            final_risk = 0.5 * iforest_risk + 0.5 * xgb_proba

        return round(float(np.clip(final_risk, 0, 100)), 2)
