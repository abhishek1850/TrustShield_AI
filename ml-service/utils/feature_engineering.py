# TrustShield AI - Feature Engineering Utility
# Bank of Baroda Hackathon 2026

import numpy as np

FEATURE_NAMES = [
    'hour_of_day',
    'is_weekend',
    'location_changed',
    'device_trusted',
    'failed_login_attempts',
    'transaction_amount',
    'file_downloads_count',
    'usb_connected',
    'vpn_used',
    'role_type',
    'privilege_escalation_attempt'
]

def map_role(role: str) -> int:
    roles = {
        'Customer': 0,
        'Employee': 1,
        'BranchManager': 2,
        'SecurityAnalyst': 3,
        'Admin': 4,
        'ComplianceOfficer': 5
    }
    return roles.get(role, 0)

def extract_features(data: dict) -> np.ndarray:
    """
    Converts a session behavior event data dictionary into a 2D numpy array
    suitable for Scikit-Learn / XGBoost inputs.
    """
    features = [
        int(data.get('hour_of_day', 12)),
        int(data.get('is_weekend', 0)),
        int(data.get('location_changed', 0)),
        int(data.get('device_trusted', 1)),
        int(data.get('failed_login_attempts', 0)),
        float(data.get('transaction_amount', 0.0)),
        int(data.get('file_downloads_count', 0)),
        int(data.get('usb_connected', 0)),
        int(data.get('vpn_used', 0)),
        map_role(data.get('role', 'Customer')),
        int(data.get('privilege_escalation_attempt', 0))
    ]
    return np.array(features).reshape(1, -1)
