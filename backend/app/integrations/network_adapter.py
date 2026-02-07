"""
Network adapter: call integrations-abhay providers-search (Edge Function) or backend search, or mock.
Uses POST /functions/v1/providers-search per integrations-abhay state.md.
No PII in logs.
"""
from __future__ import annotations

from typing import Tuple, Optional, List, Any
import aiohttp
from app.schemas.caremap import (
    UserContext,
    Navigation,
    NavigationResult,
    IntegrationError,
)
from app.core.config import settings
from app.core.logging import safe_log_info, safe_log_error

# Demo plan IDs from integrations-abhay state.md
DEMO_PLAN_IDS = {
    "bcbs": "11111111-1111-1111-1111-111111111111",
    "aetna": "22222222-2222-2222-2222-222222222222",
    "upmc": "33333333-3333-3333-3333-333333333333",
}


def _mock_navigation(user_context: UserContext, query_used: str) -> Navigation:
    """Return 3 plausible mock providers (Pittsburgh area) so frontend is never blocked."""
    results = [
        NavigationResult(
            name="UPMC Presbyterian",
            npi=None,
            address="200 Lothrop St, Pittsburgh, PA 15213",
            phone="412-647-2345",
            distance_miles=2.3,
            lat=40.4414,
            lng=-79.9600,
            network_status="in_network",
            source="mock",
        ),
        NavigationResult(
            name="AHN Wexford Health + Wellness Pavilion",
            npi=None,
            address="12311 Perry Hwy, Wexford, PA 15090",
            phone="412-359-3000",
            distance_miles=5.1,
            lat=40.6301,
            lng=-80.0576,
            network_status="in_network",
            source="mock",
        ),
        NavigationResult(
            name="St. Clair Hospital",
            npi=None,
            address="1000 Bower Hill Rd, Pittsburgh, PA 15243",
            phone="412-942-4000",
            distance_miles=4.0,
            lat=40.3756,
            lng=-80.0628,
            network_status="unknown",
            source="mock",
        ),
    ]
    return Navigation(query_used=query_used or "primary care", results=results)


async def find_in_network(
    user_context: UserContext,
    specialty_keywords: List[str],
    hints: Optional[dict] = None,
    plan_id_override: Optional[str] = None,
) -> Tuple[Navigation, Optional[IntegrationError]]:
    """
    Find nearby in-network providers. Prefer Edge Function providers-search;
    fallback to mock. hints may include provider_name, facility_name from bill.
    """
    base_url = (settings.functions_base_url or "").rstrip("/")
    lat = user_context.lat
    lng = user_context.lng

    # If no lat/lng, use a default center (e.g. Pittsburgh) for mock/API
    if lat is None or lng is None:
        lat = 40.4406
        lng = -79.9959

    query_used = " ".join(specialty_keywords).strip() or "healthcare"
    limit = 20
    source = "cache"  # or "places" / "mock" per integrations-abhay

    if not base_url:
        safe_log_info("Functions base URL not set, using mock navigation")
        return _mock_navigation(user_context, query_used), IntegrationError(
            component="integrations",
            message="Provider search not configured; using mock results.",
            recoverable=True,
        )

    url = f"{base_url}/providers-search"
    if not url.startswith("http"):
        url = f"http://{url}"

    payload = {
        "lat": lat,
        "lng": lng,
        "radius_miles": user_context.radius_miles,
        "limit": limit,
        "source": source,
        "specialty": specialty_keywords[0] if specialty_keywords else None,
        "q": query_used or None,
    }
    if plan_id_override:
        payload["plan_id"] = plan_id_override

    try:
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=payload) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    safe_log_info("providers-search non-200", status=resp.status, body_preview=(body[:200] if body else ""))
                    return _mock_navigation(user_context, query_used), IntegrationError(
                        component="integrations",
                        message=f"Provider search returned {resp.status}.",
                        recoverable=True,
                    )
                data = await resp.json()
    except Exception as e:
        safe_log_error("Provider search request failed", e)
        return _mock_navigation(user_context, query_used), IntegrationError(
            component="integrations",
            message="Provider search unavailable; using mock results.",
            recoverable=True,
        )

    # Map integrations-abhay response to Navigation
    providers: List[Any] = data.get("providers") or []
    results = []
    for p in providers:
        geo = p.get("geo") or {}
        addr = p.get("address") or {}
        if isinstance(addr, dict):
            address_str = " ".join(
                str(addr.get(k, "")) for k in ("line1", "city", "state") if addr.get(k)
            ).strip() or str(addr)
        else:
            address_str = str(addr)
        ns = p.get("network_status") or {}
        in_net = ns.get("in_network", False) if isinstance(ns, dict) else (ns == "in_network")
        network_status = "in_network" if in_net else ("out_of_network" if isinstance(ns, dict) else "unknown")
        if isinstance(ns, dict) and not in_net and ns.get("source") == "unknown":
            network_status = "unknown"
        results.append(
            NavigationResult(
                name=p.get("name") or "Provider",
                npi=p.get("npi"),
                address=address_str,
                phone=p.get("phone"),
                distance_miles=p.get("distance_miles"),
                lat=float(geo.get("lat", 0)),
                lng=float(geo.get("lng", 0)),
                network_status=network_status,
                source=ns.get("source", "cache") if isinstance(ns, dict) else "cache",
            )
        )

    if not results:
        return _mock_navigation(user_context, query_used), IntegrationError(
            component="integrations",
            message="No providers returned; using mock results.",
            recoverable=True,
        )

    return Navigation(query_used=query_used, results=results), None


class NetworkAdapter:
    async def find_in_network(
        self,
        user_context: UserContext,
        specialty_keywords: List[str],
        hints: Optional[dict] = None,
        plan_id_override: Optional[str] = None,
    ) -> Tuple[Navigation, Optional[IntegrationError]]:
        return await find_in_network(user_context, specialty_keywords, hints, plan_id_override)

    def is_live(self) -> bool:
        return bool(settings.functions_base_url)


network_adapter = NetworkAdapter()
