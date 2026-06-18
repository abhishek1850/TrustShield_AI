# TrustShield AI - Machine Learning Microservice API
# Bank of Baroda Hackathon 2026

import os
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

from utils.feature_engineering import extract_features
from models.anomaly_detector import RiskEvaluatorModel
from models.explainer import TrustShieldExplainer

# Initialize FastAPI App
app = FastAPI(
    title="TrustShield AI ML Service",
    description="Privacy-First User and Entity Behavior Analytics (UEBA) Risk Scoring Engine",
    version="1.0.0"
)

# Enable CORS for communication within microservices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load machine learning models
try:
    risk_model = RiskEvaluatorModel()
    explainer_service = TrustShieldExplainer(risk_model.xgb)
except Exception as e:
    print(f"Error initializing models in FastAPI: {e}")
    risk_model = None
    explainer_service = None

# Request Validation Schema
class BehaviorRequest(BaseModel):
    hour_of_day: int = Field(default=12, ge=0, le=23)
    is_weekend: int = Field(default=0, ge=0, le=1)
    location_changed: int = Field(default=0, ge=0, le=1)
    device_trusted: int = Field(default=1, ge=0, le=1)
    failed_login_attempts: int = Field(default=0, ge=0)
    transaction_amount: float = Field(default=0.0, ge=0.0)
    file_downloads_count: int = Field(default=0, ge=0)
    usb_connected: int = Field(default=0, ge=0, le=1)
    vpn_used: int = Field(default=0, ge=0, le=1)
    role: str = Field(default="Customer")
    privilege_escalation_attempt: int = Field(default=0, ge=0, le=1)

class EvaluateResponse(BaseModel):
    risk_score: float
    decision: str
    explanation: dict

@app.get("/health")
def health():
    if risk_model is None:
        return {"status": "unhealthy", "model_loaded": False}
        
    from models.anomaly_detector import HAS_ML_LIBRARIES
    
    if not HAS_ML_LIBRARIES:
        return {
            "status": "healthy",
            "model_loaded": False,
            "fallback_mode": True,
            "features_count": 11,
            "models": ["Rule-Based Fallback Engine"]
        }
        
    if risk_model.xgb is None or risk_model.iforest is None:
        return {"status": "unhealthy", "model_loaded": False}
        
    return {
        "status": "healthy",
        "model_loaded": True,
        "features_count": 11,
        "models": ["IsolationForest", "XGBoost"]
    }

@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate_behavior(payload: BehaviorRequest):
    if risk_model is None:
        raise HTTPException(status_code=500, detail="Risk Evaluator models are not loaded.")

    try:
        # Convert JSON payload to NumPy feature array
        features = extract_features(payload.model_dump())
        
        # Calculate hybrid risk score (0 to 100)
        risk_score = risk_model.evaluate_risk(features)

        # Map score to Security Decision Policy
        if risk_score < 40:
            decision = "ALLOW"
        elif risk_score <= 70:
            decision = "CHALLENGE_MFA"
        else:
            decision = "TERMINATE_AND_LOCK"

        # Generate Explainable AI contributions
        explanation = explainer_service.explain(features, risk_score)

        return EvaluateResponse(
            risk_score=risk_score,
            decision=decision,
            explanation=explanation
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to evaluate features: {str(e)}")

def bg_retrain():
    try:
        print("📢 [ML SERVICE] Starting background model retraining...")
        risk_model.train_models()
        global explainer_service
        explainer_service = TrustShieldExplainer(risk_model.xgb)
        print("📢 [ML SERVICE] Background model retraining completed successfully.")
    except Exception as e:
        print(f"❌ [ML SERVICE] Background model retraining failed: {e}")

@app.post("/train")
def retrain_model(background_tasks: BackgroundTasks):
    if risk_model is None:
        raise HTTPException(status_code=500, detail="Risk Evaluator service uninitialized.")
    
    background_tasks.add_task(bg_retrain)
    return {"status": "processing", "message": "Model retraining successfully scheduled in the background."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=False)
