"""
Parser service to normalize extraction results into database rows.
"""
from typing import List, Dict, Any
from app.services.docs.analyzer import ExtractionResult
from app.models.schemas import LineItem


def normalize_extraction(extraction: ExtractionResult) -> Dict[str, Any]:
    """
    Normalize extraction result into database-ready format.
    Returns dict with extraction data and line items list.
    """
    # Normalize line items
    line_items = []
    for item in extraction.line_items:
        if isinstance(item, dict):
            line_items.append(item)
        elif isinstance(item, LineItem):
            line_items.append({
                "description": item.description,
                "cpt": item.cpt,
                "billed": item.billed,
                "allowed": item.allowed,
                "plan_paid": item.plan_paid,
                "you_owe": item.you_owe,
                "network_status": item.network_status
            })
    
    return {
        "patient_responsibility": extraction.patient_responsibility,
        "provider": extraction.provider,
        "service_date": extraction.service_date,
        "plain_english_summary": extraction.plain_english_summary,
        "next_steps": extraction.next_steps,
        "raw_extraction": extraction.raw_extraction,
        "line_items": line_items
    }
