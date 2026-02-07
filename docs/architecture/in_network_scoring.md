# In-Network Scoring Specification

## Overview

In-network scoring evaluates a provider's likelihood of being in-network for a user's insurance plan. The system uses a combination of heuristics and policy-aware signals to generate a confidence score (0..1) and status classification.

## Scoring Algorithm

### Base Score Calculation

Starting score: **0.5** (neutral)

### Heuristic Weights

| Heuristic | Weight | Condition |
|-----------|--------|-----------|
| In-network system keyword | +0.20 | Provider name contains known keywords (UPMC, Allegheny Health, etc.) |
| Specialty match | +0.15 | Provider types match requested specialty keywords |
| Proximity | +0.10 | Provider within 5 miles of search center |
| PPO-style network | +0.10 | Policy indicates PPO/no referrals AND provider is doctor/outpatient |
| Out-of-network indicator | -0.25 | Provider name explicitly includes "Out of Network" |

### Score Clamping

Final score is clamped to **[0.0, 1.0]**

### Status Classification

| Score Range | Status |
|-------------|--------|
| >= 0.70 | `likely_in_network` |
| 0.40 - 0.69 | `unknown` |
| < 0.40 | `likely_out_of_network` |

## Policy-Aware Scoring

When `policy_doc_id` is provided:

### 1. RAG Retrieval

Search policy chunks with network-related queries:
- "in-network definition"
- "preferred provider network"
- "PPO network name"
- "out-of-network coverage"

Retrieve top 2-3 chunks per query.

### 2. Signal Extraction

Extract high-level signals from chunks (not raw text):
- **PPO-style network:** Chunk mentions "PPO" or "preferred provider"
- **No referrals:** Chunk mentions "no referral" or "referral not required"
- **Network name:** Extract specific network names mentioned

### 3. Heuristic Application

Apply policy signals to scoring:
- If PPO-style detected: +0.10 for doctor/outpatient providers
- Network name matching: Could add additional weight (future enhancement)

### 4. Evidence Storage

Store citations in response:
```json
{
  "evidence": [
    {
      "doc_id": "policy_001",
      "chunk_id": "chunk_07",
      "label": "Network overview"
    }
  ]
}
```

**Never store raw chunk text** in response or logs.

## Example Scoring

### Example 1: UPMC Provider (In-Network)

**Provider:**
- Name: "UPMC Dermatology"
- Types: ["doctor", "health", "dermatology"]
- Distance: 1.7 miles
- Query: "Dermatologist"

**Scoring:**
- +0.20: Name contains "UPMC" (in-network keyword)
- +0.15: Types match "dermatology" specialty
- +0.10: Within 5 miles
- **Total: 0.95** → `likely_in_network` (confidence: 0.95)

### Example 2: Unknown Provider

**Provider:**
- Name: "City Medical Center"
- Types: ["doctor", "health"]
- Distance: 8.0 miles
- Query: "Cardiologist"

**Scoring:**
- +0.15: Types match "doctor" (weak specialty match)
- **Total: 0.65** → `unknown` (confidence: 0.65)

### Example 3: Out-of-Network Provider

**Provider:**
- Name: "Out of Network Medical Center"
- Types: ["doctor", "health"]
- Distance: 2.0 miles
- Query: "Primary Care"

**Scoring:**
- -0.25: Name includes "Out of Network"
- +0.10: Within 5 miles
- **Total: 0.35** → `likely_out_of_network` (confidence: 0.35)

## Reasons Generation

Each score includes user-friendly reasons:

**Format:** Short, actionable strings
- "Provider appears affiliated with a major local health system"
- "Provider type matches requested specialty: dermatology"
- "Provider is within 5 miles"
- "Policy indicates PPO-style network usage (limited signal)"
- "Network directory verification pending"

## Confidence Interpretation

- **0.70-1.0:** High confidence in-network
- **0.40-0.69:** Uncertain, needs verification
- **0.0-0.39:** Likely out-of-network

## Future Enhancements

1. **Machine Learning:**
   - Train model on historical claim data
   - Provider network directory lookups
   - Real-time eligibility checks

2. **Advanced Signals:**
   - Provider group affiliations
   - Historical network status
   - Geographic network boundaries

3. **User Feedback:**
   - Collect user confirmations
   - Improve scoring based on feedback
   - A/B test different scoring algorithms
