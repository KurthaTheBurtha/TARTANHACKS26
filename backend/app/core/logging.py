"""
Logging utilities with PHI protection.
Never log raw document text, extracted data, or PII.
"""
import logging
from typing import Any, Dict

# Configure logger
logger = logging.getLogger(__name__)


def sanitize_for_logging(data: Any) -> Any:
    """
    Sanitize data before logging to prevent PHI exposure.
    Removes or redacts sensitive fields.
    """
    if isinstance(data, dict):
        sanitized = {}
        sensitive_keys = {
            "content", "text", "raw_extraction", "plain_english_summary",
            "description", "provider", "file_content", "file_bytes"
        }
        for key, value in data.items():
            if key.lower() in sensitive_keys:
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, (dict, list)):
                sanitized[key] = sanitize_for_logging(value)
            else:
                sanitized[key] = value
        return sanitized
    elif isinstance(data, list):
        return [sanitize_for_logging(item) for item in data]
    else:
        return data


def safe_log_info(message: str, **kwargs):
    """Log info message with sanitized kwargs."""
    sanitized_kwargs = sanitize_for_logging(kwargs)
    logger.info(f"{message} | {sanitized_kwargs}")


def safe_log_error(message: str, error: Exception = None, **kwargs):
    """Log error message with sanitized kwargs."""
    sanitized_kwargs = sanitize_for_logging(kwargs)
    error_msg = f"{message} | {sanitized_kwargs}"
    if error:
        logger.error(error_msg, exc_info=error)
    else:
        logger.error(error_msg)
