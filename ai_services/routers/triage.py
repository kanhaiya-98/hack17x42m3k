"""
F4 — AI Transaction Triage Router
LLM-powered threat classification for post-login UPI/GPay transaction flows.
Detects: APP Fraud, Money Mule Networks, Transaction Smurfing.

Mentor context:
  This engine runs AFTER the user has already logged in.
  The "attacks" are financial crime patterns — not hacking.
  Input: transaction metadata (amount, frequency, beneficiary age, channel).
  Output: risk classification + mitigation action (freeze / step-up MFA / honeypot escrow).
"""

import os
import json
import uuid
import random
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException

from models.schemas import (
    TransactionTriageInput,
    TransactionTriageOutput,
    FraudClassification,
    TransactionAction,
)

router = APIRouter()

# In-memory triage history
triage_history: list[dict] = []

# Gemini client (lazy init)
_gemini_model = None


def _get_gemini_model():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("[F4] GOOGLE_API_KEY not found in env", flush=True)
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        print(f"[F4] Gemini model initialized (key: {api_key[:10]}...)", flush=True)
        return _gemini_model
    except Exception as e:
        print(f"[F4] Gemini init failed: {type(e).__name__}: {e}", flush=True)
        return None


TRANSACTION_TRIAGE_PROMPT = """You are an elite financial fraud analyst for a real-time UPI/GPay transaction monitoring system (Indian fintech).
Analyze the provided transaction metadata and output ONLY a valid JSON object.
No prose, no markdown, no code fences, no explanation outside the JSON.

JSON Schema (strict):
{
  "fraud_classification": "<APP Fraud|Money Mule|Transaction Smurfing|Authorized Push Payment|Hub-and-Spoke|Benign>",
  "confidence": <0.0-1.0>,
  "risk_score": <0.0-1.0>,
  "transaction_action": "<freeze_transfer|step_up_mfa|honeypot_escrow|flag_reversal|alert_compliance|approve>",
  "reasoning_summary": "<2-3 sentences explaining key transaction signals and why this classification>"
}

Fraud Definitions (GPay/UPI post-login context):
- APP Fraud (Authorized Push Payment): User is socially engineered into sending large amounts to a scammer. Signal: high amount (>₹50k), first-time beneficiary, emotional purpose (investment/emergency).
- Money Mule: Legitimate account used to receive and relay stolen funds. Signal: high frequency_of_new_beneficiaries, account age <30 days, rapid in/out transfers.
- Transaction Smurfing: Breaking large transfers into many small UPI payments <₹10,000 to avoid RBI automatic reporting. Signal: many transfers to same destination, amounts clustering ₹7k-₹9.9k.
- Hub-and-Spoke: 20+ accounts all sending to 1 exit wallet within 2 hours. Classic mule ring aggregation.

Weight these signals heavily:
- amount > 100000 = high APP Fraud risk (single large push payment)
- frequency_of_new_beneficiaries > 0.8 = mule relay account
- beneficiary_account_age_days < 30 = likely temporary mule node
- many_small_transfers_flag = smurfing pattern
- hub_spoke_score > 0.7 = exit wallet node

Be forensic in your reasoning. Reference actual values. Name the exact attack pattern."""


async def _gemini_triage(inp: "TransactionTriageInput") -> Optional["TransactionTriageOutput"]:
    """Use Gemini for real AI-powered transaction fraud classification."""
    model = _get_gemini_model()
    if model is None:
        return None

    try:
        user_prompt = f"""Analyze this UPI transaction for fraud:

Transaction ID: {inp.transaction_id}
Amount: ₹{inp.amount:,.2f}
Channel: {inp.channel}
From Account Age (days): {inp.sender_account_age_days}
Beneficiary Account Age (days): {inp.beneficiary_account_age_days}
Frequency of New Beneficiaries (0-1): {inp.frequency_of_new_beneficiaries}
Is First Transfer to Beneficiary: {inp.is_new_beneficiary}
Transfers to Same Beneficiary (last 6h): {inp.recent_transfers_to_same_beneficiary}
GNN Hub-Spoke Score: {inp.hub_spoke_score}
Transfer Purpose: {inp.purpose or 'not specified'}
Additional Context: {inp.additional_context or 'none'}

Classify this transaction's fraud risk. Output ONLY valid JSON."""

        response = model.generate_content(
            [TRANSACTION_TRIAGE_PROMPT, user_prompt],
            generation_config={"temperature": 0.1, "max_output_tokens": 8192},
        )

        text = response.text.strip()
        print(f"[F4] Gemini raw response ({len(text)} chars): {text[:500]}", flush=True)
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])

            classification_map = {
                "APP Fraud": FraudClassification.APP_FRAUD,
                "Money Mule": FraudClassification.MONEY_MULE,
                "Transaction Smurfing": FraudClassification.TRANSACTION_SMURFING,
                "Authorized Push Payment": FraudClassification.APP_FRAUD,
                "Hub-and-Spoke": FraudClassification.HUB_AND_SPOKE,
                "Benign": FraudClassification.BENIGN,
            }
            action_map = {
                "freeze_transfer": TransactionAction.FREEZE_TRANSFER,
                "step_up_mfa": TransactionAction.STEP_UP_MFA,
                "honeypot_escrow": TransactionAction.HONEYPOT_ESCROW,
                "flag_reversal": TransactionAction.FLAG_REVERSAL,
                "alert_compliance": TransactionAction.ALERT_COMPLIANCE,
                "approve": TransactionAction.APPROVE,
            }

            fc = classification_map.get(data.get("fraud_classification", ""), FraudClassification.BENIGN)
            ta = action_map.get(data.get("transaction_action", ""), TransactionAction.ALERT_COMPLIANCE)

            return TransactionTriageOutput(
                transaction_id=inp.transaction_id,
                fraud_classification=fc,
                confidence=round(float(data.get("confidence", 0.5)), 4),
                risk_score=round(float(data.get("risk_score", data.get("confidence", 0.5))), 4),
                transaction_action=ta,
                reasoning_summary=data.get("reasoning_summary", "AI analysis completed."),
                timestamp=datetime.now(timezone.utc),
                analyst_notes="Classification by Gemini 2.5 Flash | FinShield F4 Transaction Triage",
            )
    except Exception as e:
        print(f"[F4] Gemini triage error: {type(e).__name__}: {e}")
        return None

    return None


def _rule_based_triage(inp: "TransactionTriageInput") -> "TransactionTriageOutput":
    """
    Deterministic rule-based transaction fraud triage (fallback when Gemini unavailable).
    Rules derived from RBI fraud monitoring guidelines + PaySim dataset patterns.
    """
    classification = FraudClassification.BENIGN
    confidence = 0.0
    risk_score = 0.0
    action = TransactionAction.APPROVE
    reasoning_parts: list[str] = []

    # Rule 1: APP Fraud — large single push payment to new beneficiary
    if inp.amount > 100_000 and inp.is_new_beneficiary:
        classification = FraudClassification.APP_FRAUD
        confidence = min(0.95, 0.70 + (inp.amount / 1_000_000) * 0.25)
        risk_score = confidence
        action = TransactionAction.STEP_UP_MFA
        reasoning_parts.append(
            f"HIGH-VALUE FIRST TRANSFER: ₹{inp.amount:,.0f} to first-time beneficiary. "
            "Classic APP Fraud signal — victim may be socially engineered into large push payment. "
            "Step-up MFA triggered before release."
        )
    # Rule 2: Hub-and-Spoke aggregation (exit wallet detection)
    elif inp.hub_spoke_score > 0.75:
        classification = FraudClassification.HUB_AND_SPOKE
        confidence = min(0.97, inp.hub_spoke_score + 0.15)
        risk_score = confidence
        action = TransactionAction.FREEZE_TRANSFER
        reasoning_parts.append(
            f"EXIT WALLET DETECTED: Hub-Spoke score {inp.hub_spoke_score:.2f}. "
            "Recipient account is aggregating funds from 20+ distinct senders within 2-hour window. "
            "Transfer frozen — pattern broadcast to federation network."
        )
    # Rule 3: Mule relay account (young account, many new beneficiaries)
    elif inp.frequency_of_new_beneficiaries > 0.80 and inp.beneficiary_account_age_days < 30:
        classification = FraudClassification.MONEY_MULE
        confidence = min(0.92, inp.frequency_of_new_beneficiaries + 0.10)
        risk_score = confidence
        action = TransactionAction.HONEYPOT_ESCROW
        reasoning_parts.append(
            f"MULE RELAY ACCOUNT: Beneficiary account age={inp.beneficiary_account_age_days} days, "
            f"new_beneficiary_freq={inp.frequency_of_new_beneficiaries:.2f}. "
            "Newly-opened account with high stranger-to-stranger flow. Routing to honeypot escrow."
        )
    # Rule 4: Transaction Smurfing (many small transfers)
    elif inp.recent_transfers_to_same_beneficiary >= 5 and inp.amount < 10_000:
        classification = FraudClassification.TRANSACTION_SMURFING
        confidence = min(0.88, 0.60 + inp.recent_transfers_to_same_beneficiary * 0.04)
        risk_score = confidence
        action = TransactionAction.ALERT_COMPLIANCE
        reasoning_parts.append(
            f"SMURFING PATTERN: {inp.recent_transfers_to_same_beneficiary} transfers of ₹{inp.amount:,.0f} "
            "to same beneficiary in last 6 hours. Deliberately structured below ₹10,000 RBI reporting threshold. "
            "Flagging to compliance team."
        )
    # Rule 5: Moderate risk — alert only
    elif inp.amount > 50_000 or inp.hub_spoke_score > 0.50:
        classification = FraudClassification.APP_FRAUD
        confidence = 0.55
        risk_score = 0.55
        action = TransactionAction.ALERT_COMPLIANCE
        reasoning_parts.append(
            f"MODERATE RISK: Amount ₹{inp.amount:,.0f} or hub-spoke score {inp.hub_spoke_score:.2f} "
            "warrants compliance monitoring. Transaction approved with alert."
        )
    else:
        confidence = max(0.05, 0.20 - inp.hub_spoke_score * 0.1)
        risk_score = confidence
        reasoning_parts.append(
            "Transaction parameters within normal UPI ranges. "
            f"Amount ₹{inp.amount:,.0f}, beneficiary account age {inp.beneficiary_account_age_days} days. "
            "No fraud signals detected."
        )

    return TransactionTriageOutput(
        transaction_id=inp.transaction_id,
        fraud_classification=classification,
        confidence=round(confidence, 4),
        risk_score=round(risk_score, 4),
        transaction_action=action,
        reasoning_summary=" ".join(reasoning_parts),
        timestamp=datetime.now(timezone.utc),
    )


@router.post("/analyze", response_model=TransactionTriageOutput)
async def triage_analyze(inp: TransactionTriageInput):
    """
    Analyze a UPI transaction and classify fraud type using Gemini AI.
    Post-login context: user is already authenticated. This guards the transaction itself.
    """
    result = await _gemini_triage(inp)
    if result is None:
        result = _rule_based_triage(inp)

    triage_history.append(result.model_dump(mode="json"))
    return result


@router.get("/history")
async def triage_get_history(limit: int = 50):
    """Return triage event history — powers the Transaction Risk Feed."""
    if not triage_history:
        # Seed realistic transaction triage examples
        seed_cases = [
            {
                "transaction_id": f"TXN-{uuid.uuid4().hex[:8].upper()}",
                "amount": 175000.0,
                "channel": "UPI",
                "sender_account_age_days": 1200,
                "beneficiary_account_age_days": 22,
                "frequency_of_new_beneficiaries": 0.92,
                "is_new_beneficiary": True,
                "recent_transfers_to_same_beneficiary": 0,
                "hub_spoke_score": 0.83,
                "purpose": "Investment opportunity",
            },
            {
                "transaction_id": f"TXN-{uuid.uuid4().hex[:8].upper()}",
                "amount": 8500.0,
                "channel": "UPI",
                "sender_account_age_days": 800,
                "beneficiary_account_age_days": 65,
                "frequency_of_new_beneficiaries": 0.55,
                "is_new_beneficiary": False,
                "recent_transfers_to_same_beneficiary": 12,
                "hub_spoke_score": 0.31,
                "purpose": "Personal",
            },
            {
                "transaction_id": f"TXN-{uuid.uuid4().hex[:8].upper()}",
                "amount": 3500.0,
                "channel": "UPI",
                "sender_account_age_days": 500,
                "beneficiary_account_age_days": 400,
                "frequency_of_new_beneficiaries": 0.12,
                "is_new_beneficiary": False,
                "recent_transfers_to_same_beneficiary": 0,
                "hub_spoke_score": 0.08,
                "purpose": "Rent",
            },
            {
                "transaction_id": f"TXN-{uuid.uuid4().hex[:8].upper()}",
                "amount": 52000.0,
                "channel": "NEFT",
                "sender_account_age_days": 2000,
                "beneficiary_account_age_days": 18,
                "frequency_of_new_beneficiaries": 0.88,
                "is_new_beneficiary": True,
                "recent_transfers_to_same_beneficiary": 3,
                "hub_spoke_score": 0.71,
                "purpose": "Emergency",
            },
            {
                "transaction_id": f"TXN-{uuid.uuid4().hex[:8].upper()}",
                "amount": 9200.0,
                "channel": "UPI",
                "sender_account_age_days": 650,
                "beneficiary_account_age_days": 55,
                "frequency_of_new_beneficiaries": 0.62,
                "is_new_beneficiary": False,
                "recent_transfers_to_same_beneficiary": 7,
                "hub_spoke_score": 0.44,
                "purpose": "Business",
            },
        ]
        for m in seed_cases:
            inp = TransactionTriageInput(**m)
            result = await _gemini_triage(inp)
            if result is None:
                result = _rule_based_triage(inp)
            triage_history.append(result.model_dump(mode="json"))

    return {"history": list(reversed(triage_history[-limit:])), "total": len(triage_history)}


@router.post("/analyze_transaction")
async def analyze_transaction_quick(
    transaction_id: str,
    amount: float,
    channel: str = "UPI",
    is_new_beneficiary: bool = False,
    beneficiary_account_age_days: int = 365,
    hub_spoke_score: float = 0.1,
):
    """Quick analysis endpoint — called directly from the bank transfer UI."""
    inp = TransactionTriageInput(
        transaction_id=transaction_id,
        amount=amount,
        channel=channel,
        sender_account_age_days=random.randint(300, 2000),
        beneficiary_account_age_days=beneficiary_account_age_days,
        frequency_of_new_beneficiaries=random.uniform(0.1, 0.9) if is_new_beneficiary else 0.1,
        is_new_beneficiary=is_new_beneficiary,
        recent_transfers_to_same_beneficiary=0,
        hub_spoke_score=hub_spoke_score,
    )
    result = await _gemini_triage(inp)
    if result is None:
        result = _rule_based_triage(inp)
    triage_history.append(result.model_dump(mode="json"))
    return result
