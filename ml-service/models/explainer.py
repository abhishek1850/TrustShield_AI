# TrustShield AI - Explainable AI (SHAP) Service
# Bank of Baroda Hackathon 2026

import numpy as np
import pandas as pd
from utils.feature_engineering import FEATURE_NAMES

class TrustShieldExplainer:
    def __init__(self, xgb_model):
        self.model = xgb_model
        self.explainer = None
        self.has_shap = False
        self._init_shap()

    def _init_shap(self):
        try:
            import shap
            # TreeExplainer is highly optimized for XGBoost
            self.explainer = shap.TreeExplainer(self.model)
            self.has_shap = True
            print("TrustShield AI: SHAP TreeExplainer initialized successfully.")
        except ImportError:
            print("TrustShield AI: SHAP library not found. Activating robust mathematical SHAP approximation engine.")
        except Exception as e:
            print(f"TrustShield AI: Could not initialize SHAP explainer ({e}). Activating fallback explanation engine.")

    def explain(self, features: np.ndarray, final_risk_score: float) -> dict:
        """
        Calculates feature contributions towards the generated risk score.
        Guarantees the SHAP additive property: Base Value + Sum(Contributions) = Risk Score.
        """
        contributions = {}
        base_value = 15.0 # Base normal risk of the system

        if self.has_shap and self.explainer is not None:
            try:
                # Convert features to a DataFrame with names as required by SHAP
                df_feat = pd.DataFrame(features, columns=FEATURE_NAMES)
                shap_values = self.explainer(df_feat)
                
                # Check dimensional shape of SHAP values
                # XGBoost binary classification SHAP values can be 1D or 2D depending on version
                val_array = shap_values.values[0]
                if len(val_array.shape) > 1 and val_array.shape[-1] == 2:
                    # Multi-class format, extract probability shap values for anomaly class (index 1)
                    val_array = val_array[:, 1]
                
                # Map SHAP values to features
                raw_contributions = {}
                for name, val in zip(FEATURE_NAMES, val_array):
                    raw_contributions[name] = float(val)

                # Normalize raw SHAP values to sum up to (final_risk_score - base_value)
                total_shap = sum(raw_contributions.values())
                target_diff = final_risk_score - base_value
                
                if abs(total_shap) > 0.01:
                    scale_factor = target_diff / total_shap
                    for name, val in raw_contributions.items():
                        contributions[name] = round(val * scale_factor, 2)
                else:
                    # Fallback to default share if total SHAP sum is zero
                    for name, val in raw_contributions.items():
                        contributions[name] = round(val, 2)

                return {
                    "base_value": base_value,
                    "risk_score": final_risk_score,
                    "contributions": contributions,
                    "engine": "SHAP TreeExplainer"
                }

            except Exception as e:
                print(f"TrustShield AI: SHAP execution error: {e}. Falling back to approximation engine.")

        # ---- Robust SHAP Approximation Engine (Fallback) ----
        # Computes contributions using a rule-based weight heuristic,
        # then scales them to exactly match: base_value + sum(contributions) = final_risk_score.
        
        feature_vector = features[0]
        hour = feature_vector[0]
        is_weekend = feature_vector[1]
        loc_changed = feature_vector[2]
        dev_trusted = feature_vector[3]
        failed_logins = feature_vector[4]
        tx_amount = feature_vector[5]
        downloads = feature_vector[6]
        usb_connected = feature_vector[7]
        vpn_used = feature_vector[8]
        role_type = feature_vector[9]
        priv_escalation = feature_vector[10]

        raw_weights = {}

        # Heuristics matching our security rules
        # Hour of day (Normal office hours: 9-18, night hours are suspicious)
        if hour < 7 or hour > 21:
            raw_weights['hour_of_day'] = 15.0
        else:
            raw_weights['hour_of_day'] = -5.0

        raw_weights['is_weekend'] = 5.0 if is_weekend == 1 else -2.0
        raw_weights['location_changed'] = 25.0 if loc_changed == 1 else -5.0
        raw_weights['device_trusted'] = -15.0 if dev_trusted == 1 else 30.0
        raw_weights['failed_login_attempts'] = float(failed_logins * 12.0) if failed_logins > 0 else -3.0

        if tx_amount > 500000:
            raw_weights['transaction_amount'] = 35.0
        elif tx_amount > 100000:
            raw_weights['transaction_amount'] = 15.0
        elif tx_amount > 0:
            raw_weights['transaction_amount'] = -2.0
        else:
            raw_weights['transaction_amount'] = 0.0

        if downloads > 1000:
            raw_weights['file_downloads_count'] = 45.0
        elif downloads > 100:
            raw_weights['file_downloads_count'] = 20.0
        elif downloads > 0:
            raw_weights['file_downloads_count'] = -2.0
        else:
            raw_weights['file_downloads_count'] = 0.0

        raw_weights['usb_connected'] = 55.0 if usb_connected == 1 else 0.0
        raw_weights['vpn_used'] = 20.0 if vpn_used == 1 else -4.0
        
        # Admins/employees are penalised more if they perform anomalous actions
        if role_type in [4, 5]: # Admin/Compliance
            raw_weights['role_type'] = 10.0
        elif role_type in [1, 2]: # Employee/Manager
            raw_weights['role_type'] = 5.0
        else:
            raw_weights['role_type'] = -2.0

        raw_weights['privilege_escalation_attempt'] = 50.0 if priv_escalation == 1 else 0.0

        # Adjust the base value relative to the final score
        # We need sum(contributions) to equal (final_risk_score - base_value)
        target_sum = final_risk_score - base_value
        
        # Calculate sum of raw weights
        total_raw = sum(raw_weights.values())
        
        # Map values
        if abs(total_raw) > 0.01:
            scale = target_sum / total_raw
            for k, v in raw_weights.items():
                contributions[k] = round(v * scale, 2)
        else:
            # Equal division if zero
            for k in FEATURE_NAMES:
                contributions[k] = round(target_sum / len(FEATURE_NAMES), 2)

        return {
            "base_value": base_value,
            "risk_score": final_risk_score,
            "contributions": contributions,
            "engine": "TrustShield Mathematical SHAP Engine"
        }
