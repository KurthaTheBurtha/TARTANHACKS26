"""
Network heuristics and scoring weights.
"""
from typing import Dict, Any, List, Tuple


def calculate_base_score(
    provider: Dict[str, Any],
    query: str,
    policy_signals: Dict[str, Any]
) -> Tuple[float, List[str]]:
    """
    Calculate base in-network score using heuristics.
    Returns (score, reasons) where score is 0..1.
    """
    score = 0.5  # Start at neutral
    reasons = []
    
    # +0.20 if provider name contains known in-network system keyword
    in_network_keywords = ["upmc", "allegheny health", "ahc", "ahp", "preferred provider"]
    provider_name_lower = provider.get("name", "").lower()
    
    for keyword in in_network_keywords:
        if keyword in provider_name_lower:
            score += 0.20
            reasons.append("Provider appears affiliated with a major local health system")
            break
    
    # +0.15 if types match requested specialty keywords
    query_lower = query.lower()
    provider_types = [t.lower() for t in provider.get("types", [])]
    
    specialty_keywords = {
        "dermatology": ["dermatology", "dermatologist"],
        "cardiology": ["cardiology", "cardiologist", "heart"],
        "internal": ["internal", "primary", "general"],
        "hospital": ["hospital"]
    }
    
    for specialty, keywords in specialty_keywords.items():
        if any(kw in query_lower for kw in keywords):
            if any(pt in keywords or specialty in pt for pt in provider_types):
                score += 0.15
                reasons.append(f"Provider type matches requested specialty: {specialty}")
                break
    
    # +0.10 if provider is within 5 miles
    distance = provider.get("distance_miles", 999)
    if distance <= 5.0:
        score += 0.10
        reasons.append("Provider is within 5 miles")
    
    # +0.10 if policy mentions "PPO" or "no referrals needed" and provider type is doctor/outpatient
    if policy_signals.get("ppo_style", False) or policy_signals.get("no_referrals", False):
        if any(t in ["doctor", "outpatient", "health"] for t in provider_types):
            score += 0.10
            reasons.append("Policy indicates PPO-style network usage (limited signal)")
    
    # -0.25 if provider name includes "Out of Network"
    if "out of network" in provider_name_lower or "out-of-network" in provider_name_lower:
        score -= 0.25
        reasons.append("Provider name explicitly indicates out-of-network status")
    
    # Clamp to [0, 1]
    score = max(0.0, min(1.0, score))
    
    return score, reasons


def map_score_to_status(score: float) -> str:
    """
    Map score to network status.
    """
    if score >= 0.70:
        return "likely_in_network"
    elif score >= 0.40:
        return "unknown"
    else:
        return "likely_out_of_network"
