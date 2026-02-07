"""
Notes API: summary of health concerns from user notes.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from app.core.config import settings
from app.llm import generate_text

router = APIRouter()


class NoteInput(BaseModel):
    subject: str
    description: str
    createdAt: str


class NotesSummaryRequest(BaseModel):
    notes: List[NoteInput]


class NotesSummaryResponse(BaseModel):
    summary: str
    history: str


async def _generate_summary(notes: List[dict]) -> tuple[str, str]:
    """Use LLM to generate summary and history from notes."""
    has_llm = (
        (settings.openai_api_key and settings.openai_api_key.strip())
        or (settings.gemini_api_key and settings.gemini_api_key.strip())
    )
    if not has_llm:
        # Fallback: simple aggregation
        lines = []
        for n in notes:
            subj = n.get("subject") or "Note"
            desc = (n.get("description") or "").strip()
            date = (n.get("createdAt") or "")[:10]
            if desc:
                lines.append(f"- {date}: {subj} — {desc[:100]}{'…' if len(desc) > 100 else ''}")
            else:
                lines.append(f"- {date}: {subj}")
        text = "\n".join(lines) if lines else "No notes yet."
        return text, text

    formatted = "\n".join(
        f"[{i+1}] {n.get('subject', 'Note')} ({str(n.get('createdAt', ''))[:10]}): {n.get('description', '')[:400]}"
        for i, n in enumerate(notes[:20])
    )
    if not formatted.strip():
        return "No notes yet.", "No health concerns recorded."

    system = (
        "You are a helpful health assistant. Given a user's saved notes (often symptoms and health concerns), "
        "provide: (1) a brief 2-3 sentence summary of their main health concerns, and (2) a chronological history "
        "of concerns. Be concise and compassionate."
    )
    prompt = f"""User's saved notes:

{formatted}

Provide your response in exactly this format:
SUMMARY: [2-3 sentence summary of main health concerns]
HISTORY: [Chronological bullet list of concerns with dates if available]"""

    try:
        text = await generate_text(
            prompt=prompt,
            system=system,
            provider=None,
            model=None,
            temperature=0.2,
        )
        if not text or "[LLM mock]" in text[:50]:
            lines = [
                f"- {str(n.get('createdAt', ''))[:10]}: {n.get('subject', 'Note')} — {(n.get('description') or '')[:80]}"
                for n in notes
            ]
            fallback = "\n".join(lines) if lines else "No notes yet."
            return fallback, fallback

        summary = ""
        history = ""
        if "SUMMARY:" in text:
            parts = text.split("HISTORY:", 1)
            summary = (parts[0].replace("SUMMARY:", "").strip() or text[:200])[:500]
            history = (parts[1].strip() if len(parts) > 1 else text)[:1000]
        else:
            summary = text[:400]
            history = text[:800]
        return summary, history
    except Exception:
        lines = [
            f"- {str(n.get('createdAt', ''))[:10]}: {n.get('subject', 'Note')} — {(n.get('description') or '')[:80]}"
            for n in notes
        ]
        fallback = "\n".join(lines) if lines else "No notes yet."
        return fallback, fallback


@router.post("/summary", response_model=NotesSummaryResponse)
async def get_notes_summary(request: NotesSummaryRequest):
    """
    Generate a summary and history of health concerns from the user's notes.
    No auth required for demo; add auth in production.
    """
    notes = [n.model_dump() for n in request.notes]
    if not notes:
        return NotesSummaryResponse(
            summary="No notes yet.",
            history="No health concerns recorded. Add notes from the chat or dashboard to track symptoms and concerns.",
        )
    summary, history = await _generate_summary(notes)
    return NotesSummaryResponse(summary=summary, history=history)
