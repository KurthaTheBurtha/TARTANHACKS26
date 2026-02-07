"""
Provider-agnostic LLM client: OpenAI and Gemini.
Uses official SDKs; missing keys return mock response with warning; optional fallback on error.
"""
from enum import Enum
from typing import AsyncIterator, Optional

from app.core.config import settings
from app.core.logging import safe_log_info, safe_log_error


class LLMProvider(str, Enum):
    OPENAI = "openai"
    GEMINI = "gemini"


# Default models per provider
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"

MOCK_WARNING_PREFIX = "[LLM mock] "


def _resolve_provider(provider: Optional[LLMProvider] = None) -> LLMProvider:
    raw = (provider or settings.llm_provider or "openai").strip().lower()
    if raw == "gemini":
        return LLMProvider.GEMINI
    return LLMProvider.OPENAI


def _has_openai_key() -> bool:
    return bool(settings.openai_api_key and settings.openai_api_key.strip())


def _has_gemini_key() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_api_key.strip())


def _mock_response_with_warning(reason: str) -> str:
    safe_log_info("LLM mock used (key missing or error)", reason=reason)
    return f"{MOCK_WARNING_PREFIX}{reason} This is placeholder text; configure the selected provider's API key for real responses."


async def _generate_openai(
    prompt: str,
    system: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
    stream: bool = False,
) -> str | AsyncIterator[str]:
    if not _has_openai_key():
        async def _mock():
            yield _mock_response_with_warning("OPENAI_API_KEY not set.")
        return _mock()
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        model = model or DEFAULT_OPENAI_MODEL
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        if stream:
            async def _stream():
                stream_resp = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=1024,
                    stream=True,
                )
                async for chunk in stream_resp:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content

            return _stream()

        resp = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=1024,
        )
        return (resp.choices[0].message.content or "").strip()
    except ImportError:
        safe_log_error("OpenAI library not installed")
        return _mock_response_with_warning("OpenAI SDK not available.")
    except Exception as e:
        safe_log_error("OpenAI API error (no secret logged)", error=str(type(e).__name__))
        return _mock_response_with_warning(f"OpenAI error: {type(e).__name__}.")


async def _generate_gemini(
    prompt: str,
    system: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
    stream: bool = False,
) -> str | AsyncIterator[str]:
    if not _has_gemini_key():
        async def _mock():
            yield _mock_response_with_warning("GEMINI_API_KEY not set.")
        return _mock()
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model_name = model or DEFAULT_GEMINI_MODEL
        mdl = genai.GenerativeModel(model_name)

        full_prompt = prompt
        if system:
            full_prompt = f"{system}\n\n{prompt}"

        if stream:
            async def _stream():
                # google-generativeai is sync; get full response then yield in chunks
                resp = mdl.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=temperature,
                        max_output_tokens=1024,
                    ),
                )
                text = (resp.text or "").strip()
                chunk_size = 50
                for i in range(0, len(text), chunk_size):
                    yield text[i : i + chunk_size]

            return _stream()

        resp = mdl.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=1024,
            ),
        )
        if not resp or not resp.text:
            return _mock_response_with_warning("Gemini returned empty response.")
        return resp.text.strip()
    except ImportError:
        safe_log_error("Google Generative AI library not installed")
        return _mock_response_with_warning("Gemini SDK not available.")
    except Exception as e:
        safe_log_error("Gemini API error (no secret logged)", error=str(type(e).__name__))
        return _mock_response_with_warning(f"Gemini error: {type(e).__name__}.")


async def generate_text(
    prompt: str,
    system: Optional[str] = None,
    provider: Optional[LLMProvider] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
) -> str:
    """
    Generate text from the given prompt using the selected provider.
    Default provider from env LLM_PROVIDER (openai | gemini).
    If provider key is missing, returns mock response with warning (no secrets logged).
    On provider error, optionally tries the other provider.
    """
    prov = _resolve_provider(provider)
    result: str | AsyncIterator[str] = ""
    try:
        if prov == LLMProvider.OPENAI:
            result = await _generate_openai(prompt, system=system, model=model, temperature=temperature, stream=False)
        else:
            result = await _generate_gemini(prompt, system=system, model=model, temperature=temperature, stream=False)
    except Exception as e:
        safe_log_error("LLM generate_text failed", error=str(type(e).__name__))
        fallback = LLMProvider.GEMINI if prov == LLMProvider.OPENAI else LLMProvider.OPENAI
        if (fallback == LLMProvider.OPENAI and _has_openai_key()) or (fallback == LLMProvider.GEMINI and _has_gemini_key()):
            safe_log_info("Falling back to other provider", fallback=fallback.value)
            if fallback == LLMProvider.OPENAI:
                result = await _generate_openai(prompt, system=system, model=model, temperature=temperature, stream=False)
            else:
                result = await _generate_gemini(prompt, system=system, model=model, temperature=temperature, stream=False)
        else:
            result = _mock_response_with_warning(f"Primary provider failed; no fallback key configured.")
    return result if isinstance(result, str) else ""


async def generate_text_stream(
    prompt: str,
    system: Optional[str] = None,
    provider: Optional[LLMProvider] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
) -> AsyncIterator[str]:
    """
    Stream generated text tokens from the selected provider.
    If provider key missing or error, yields mock warning then stub text.
    """
    prov = _resolve_provider(provider)
    try:
        if prov == LLMProvider.OPENAI:
            gen = await _generate_openai(prompt, system=system, model=model, temperature=temperature, stream=True)
        else:
            gen = await _generate_gemini(prompt, system=system, model=model, temperature=temperature, stream=True)
        if isinstance(gen, str):
            yield gen
            return
        async for chunk in gen:
            yield chunk
    except Exception as e:
        safe_log_error("LLM stream failed", error=str(type(e).__name__))
        fallback = LLMProvider.GEMINI if prov == LLMProvider.OPENAI else LLMProvider.OPENAI
        if (fallback == LLMProvider.OPENAI and _has_openai_key()) or (fallback == LLMProvider.GEMINI and _has_gemini_key()):
            safe_log_info("Stream fallback to other provider", fallback=fallback.value)
            try:
                if fallback == LLMProvider.OPENAI:
                    gen = await _generate_openai(prompt, system=system, model=model, temperature=temperature, stream=True)
                else:
                    gen = await _generate_gemini(prompt, system=system, model=model, temperature=temperature, stream=True)
                if isinstance(gen, str):
                    yield gen
                    return
                async for chunk in gen:
                    yield chunk
                return
            except Exception:
                pass
        msg = _mock_response_with_warning("Stream failed; no fallback.")
        for word in msg.split():
            yield word + " "


async def summarize_document(text: str, provider: Optional[LLMProvider] = None) -> str:
    """
    Summarize document text in plain language.
    Uses default or requested provider; returns mock with warning if key missing.
    """
    system = "You are a helpful assistant that summarizes medical and insurance documents in clear, plain English. Be concise."
    prompt = f"Summarize the following document in 2–4 sentences. Focus on key facts and any amounts or dates.\n\n---\n\n{text[:8000]}"
    return await generate_text(
        prompt=prompt,
        system=system,
        provider=provider,
        model=None,
        temperature=0.2,
    )
