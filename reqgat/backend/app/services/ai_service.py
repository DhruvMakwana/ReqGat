"""
BYOK AI service — supports Claude and OpenAI.
The tenant provides their own API key stored encrypted in the DB.
"""
from __future__ import annotations

import json
from typing import Protocol, runtime_checkable

from app.core.security import decrypt_api_key
from app.models.tenant import Tenant
from app.schemas.requirement import DiscoveryResult, DiscoveryItem
from app.schemas.scenario import ScenarioCreate


DISCOVERY_SYSTEM_PROMPT = """You are a requirements engineering assistant.
Given a high-level business requirement in free text, extract and structure it into three categories:
1. what_to_do: Core functional requirements (what the system MUST do)
2. what_not_to_do: Explicit exclusions (what is OUT of scope)
3. what_if: Exception/conditional scenarios (edge cases the system should handle)

Return a JSON object with this exact structure:
{
  "what_to_do": [{"title": "...", "description": "..."}],
  "what_not_to_do": [{"title": "...", "description": "..."}],
  "what_if": [{"title": "...", "description": "..."}]
}

Rules:
- Minimum 2 items per category
- Titles should be concise action phrases
- Descriptions add context (1-2 sentences)
- what_if items should be realistic edge cases or exceptions
"""

SCENARIO_SYSTEM_PROMPT = """You are a requirements engineering assistant.
Given a functional requirement, generate exactly 3 scenarios that could occur when this requirement is implemented.
Generate one of each type:
1. edge_case: An unusual but valid situation at the boundary of normal operation
2. exception: An error condition or failure scenario that must be handled
3. conditional: A situation where the behavior changes based on a condition

Return a JSON array with this exact structure:
[
  {"type": "edge_case", "description": "..."},
  {"type": "exception", "description": "..."},
  {"type": "conditional", "description": "..."}
]

Each description should be 1-2 sentences, specific and actionable.
"""


@runtime_checkable
class AIProvider(Protocol):
    async def structure_requirements(self, free_text: str, domain: str) -> DiscoveryResult: ...
    async def expand_scenarios(self, requirement_title: str, requirement_desc: str) -> list[ScenarioCreate]: ...


class ClaudeProvider:
    def __init__(self, api_key: str):
        import anthropic
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    async def structure_requirements(self, free_text: str, domain: str) -> DiscoveryResult:
        user_msg = f"Domain: {domain}\n\nBusiness requirement:\n{free_text}"
        response = await self._client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=DISCOVERY_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = response.content[0].text
        data = _parse_json(raw)
        return _build_discovery_result(data)

    async def expand_scenarios(self, requirement_title: str, requirement_desc: str) -> list[ScenarioCreate]:
        user_msg = f"Requirement: {requirement_title}\nContext: {requirement_desc or 'N/A'}"
        response = await self._client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SCENARIO_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = response.content[0].text
        data = _parse_json(raw)
        return [ScenarioCreate(**item) for item in data]


class OpenAIProvider:
    def __init__(self, api_key: str):
        import openai
        self._client = openai.AsyncOpenAI(api_key=api_key)

    async def structure_requirements(self, free_text: str, domain: str) -> DiscoveryResult:
        user_msg = f"Domain: {domain}\n\nBusiness requirement:\n{free_text}"
        response = await self._client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": DISCOVERY_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
        )
        raw = response.choices[0].message.content
        data = _parse_json(raw)
        return _build_discovery_result(data)

    async def expand_scenarios(self, requirement_title: str, requirement_desc: str) -> list[ScenarioCreate]:
        user_msg = f"Requirement: {requirement_title}\nContext: {requirement_desc or 'N/A'}"
        response = await self._client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SCENARIO_SYSTEM_PROMPT + "\nWrap array in {\"scenarios\": [...]}"},
                {"role": "user", "content": user_msg},
            ],
        )
        raw = response.choices[0].message.content
        data = _parse_json(raw)
        items = data if isinstance(data, list) else data.get("scenarios", [])
        return [ScenarioCreate(**item) for item in items]


def get_ai_provider(tenant: Tenant) -> AIProvider:
    if tenant.ai_provider == "claude" and tenant.api_key_claude_enc:
        return ClaudeProvider(decrypt_api_key(tenant.api_key_claude_enc))
    if tenant.ai_provider == "openai" and tenant.api_key_openai_enc:
        return OpenAIProvider(decrypt_api_key(tenant.api_key_openai_enc))
    raise ValueError(
        f"No API key configured for provider '{tenant.ai_provider}'. "
        "Please add your API key in Settings."
    )


def _parse_json(text: str) -> dict | list:
    """Extract JSON from a response that may have surrounding text."""
    text = text.strip()
    # Find first { or [
    start = min(
        (text.find(c) for c in ["{", "["] if text.find(c) != -1),
        default=0,
    )
    text = text[start:]
    return json.loads(text)


def _build_discovery_result(data: dict) -> DiscoveryResult:
    def to_items(raw: list, category: str) -> list[DiscoveryItem]:
        return [
            DiscoveryItem(
                title=item.get("title", ""),
                description=item.get("description"),
                category=category,
            )
            for item in raw
        ]

    return DiscoveryResult(
        what_to_do=to_items(data.get("what_to_do", []), "what_to_do"),
        what_not_to_do=to_items(data.get("what_not_to_do", []), "what_not_to_do"),
        what_if=to_items(data.get("what_if", []), "what_if"),
    )
