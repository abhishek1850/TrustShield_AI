# TrustShield AI - Automated Security Verification Suite
# Bank of Baroda Hackathon 2026
# Zero-dependency integration testing script using standard library urllib

import json
import urllib.request
import urllib.error
import sys
import time

BACKEND_URL = "http://localhost:5000"
ML_URL = "http://localhost:8080"

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    
    req_data = None
    if data:
        req_data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=3) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode('utf-8'))
        except:
            err_body = e.reason
        return e.code, err_body
    except Exception as e:
        return 0, str(e)

def run_tests():
    print("=========================================================")
    print("[TrustShield] TrustShield AI: Starting Security Integration Tests...")
    print("=========================================================")
    time.sleep(1)

    # TEST 1: Check Python ML Service Health
    print("\n[RUN] Test 1: Checking ML Microservice Health...")
    status, body = make_request(f"{ML_URL}/health")
    if status == 200 and body.get("status") == "healthy":
        print("[OK] Success: ML Service is healthy and models loaded.")
    else:
        print(f"[FAIL] Error: ML health failed (HTTP {status}): {body}")
        print("Ensure you start the services before running tests!")
        sys.exit(1)

    # TEST 2: Evaluate Normal Behavior
    print("\n[RUN] Test 2: Simulating NORMAL User Behavior Vector...")
    normal_payload = {
        "hour_of_day": 14,
        "is_weekend": 0,
        "location_changed": 0,
        "device_trusted": 1,
        "failed_login_attempts": 0,
        "transaction_amount": 5000.0,
        "file_downloads_count": 0,
        "usb_connected": 0,
        "vpn_used": 0,
        "role": "Customer",
        "privilege_escalation_attempt": 0
    }
    status, body = make_request(f"{ML_URL}/evaluate", method="POST", data=normal_payload)
    risk_score = body.get("risk_score", 100)
    decision = body.get("decision", "")
    
    if status == 200 and risk_score < 40 and decision == "ALLOW":
        print(f"[OK] Success: Normal risk evaluated at {risk_score}%. Policy decision: {decision}")
    else:
        print(f"[FAIL] Error: Failed normal evaluation (HTTP {status}): {body}")
        sys.exit(1)

    # TEST 3: Evaluate Anomalous Behavior (Insider Threat USB Connection)
    print("\n[RUN] Test 3: Simulating ANOMALOUS Insider Threat (USB Storage Connect)...")
    anomalous_payload = {
        "hour_of_day": 12,
        "is_weekend": 0,
        "location_changed": 0,
        "device_trusted": 1,
        "failed_login_attempts": 0,
        "transaction_amount": 0.0,
        "file_downloads_count": 50,
        "usb_connected": 1, # Flash drive attached!
        "vpn_used": 0,
        "role": "Employee",
        "privilege_escalation_attempt": 0
    }
    status, body = make_request(f"{ML_URL}/evaluate", method="POST", data=anomalous_payload)
    risk_score = body.get("risk_score", 0)
    decision = body.get("decision", "")
    
    if status == 200 and risk_score > 70 and decision == "TERMINATE_AND_LOCK":
        print(f"[OK] Success: Critical risk detected at {risk_score}%. Policy decision: {decision}")
    else:
        print(f"[FAIL] Error: Failed anomaly evaluation (HTTP {status}): {body}")
        sys.exit(1)

    # TEST 4: Evaluate Suspicious Transaction (Triggers challenge)
    print("\n[RUN] Test 4: Simulating SUSPICIOUS Account Transaction (MFA Challenge)...")
    suspicious_payload = {
        "hour_of_day": 23, # midnight
        "is_weekend": 1,  # weekend
        "location_changed": 1, # changed location
        "device_trusted": 1,
        "failed_login_attempts": 0,
        "transaction_amount": 180000.0, # high value transaction
        "file_downloads_count": 0,
        "usb_connected": 0,
        "vpn_used": 1, # VPN active
        "role": "Customer",
        "privilege_escalation_attempt": 0
    }
    status, body = make_request(f"{ML_URL}/evaluate", method="POST", data=suspicious_payload)
    risk_score = body.get("risk_score", 0)
    decision = body.get("decision", "")
    
    if status == 200 and 40 <= risk_score <= 70 and decision == "CHALLENGE_MFA":
        print(f"[OK] Success: Moderate risk detected at {risk_score}%. Policy decision: {decision}")
    else:
        print(f"[FAIL] Error: Failed suspicious evaluation (HTTP {status}): {body}")
        sys.exit(1)

    print("\n=========================================================")
    print("[SUCCESS] All TrustShield AI Integration Tests Passed Successfully!")
    print("=========================================================")

if __name__ == "__main__":
    run_tests()
