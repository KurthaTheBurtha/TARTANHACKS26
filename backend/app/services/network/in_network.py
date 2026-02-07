"""
In-network scoring service with policy-aware evaluation.
"""
from typing import Dict, Any, List, Optional
from app.services.network.heuristics import calculate_base_score, map_score_to_status
from app.services.rag.retriever import search_chunks
from app.core.logging import safe_log_info


def evaluate_in_network(
    provider: Dict[str, Any],
    user_id: str,
    query: str,
    policy_doc_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluate provider's in-network status with policy-aware scoring.
    Returns network object with status, confidence, reasons, and evidence.
    """
    # Extract policy signals via RAG if policy_doc_id provided
    policy_signals = {}
    evidence = []
    
    if policy_doc_id:
        try:
            # Search for network-related policy chunks
            network_queries = [
                "in-network definition",
                "preferred provider network",
                "PPO network name",
                "out-of-network coverage"
            ]
            
            all_chunks = []
            for net_query in network_queries:
                chunks = search_chunks(net_query, user_id, top_k=1, doc_id=policy_doc_id)
                all_chunks.extend(chunks)
            
            # Extract high-level signals (not raw text)
            if all_chunks:
                # Check for PPO signals
                for chunk in all_chunks[:3]:  # Top 3 chunks
                    chunk_text_lower = chunk.text.lower()
                    if "ppo" in chunk_text_lower or "preferred provider" in chunk_text_lower:
                        policy_signals["ppo_style"] = True
                    if "no referral" in chunk_text_lower or "referral not required" in chunk_text_lower:
                        policy_signals["no_referrals"] = True
                    
                    # Add citation
                    evidence.append({
                        "doc_id": chunk.doc_id,
                        "chunk_id": chunk.chunk_id,
                        "label": chunk.metadata.get("label", "Policy excerpt")
                    })
        except Exception as e:
            safe_log_info("Failed to retrieve policy signals", error=str(e), provider_id=provider.get("provider_id"))
    
    # Calculate base score using heuristics
    score, reasons = calculate_base_score(provider, query, policy_signals)
    
    # Map score to status
    status = map_score_to_status(score)
    
    # If no policy evidence and score is neutral, add note
    if not evidence and score >= 0.40 and score < 0.70:
        reasons.append("Network directory verification pending")
    
    return {
        "status": status,
        "confidence": round(score, 2),
        "reasons": reasons,
        "evidence": evidence if evidence else []
    }
