"""
Urban Bites MCP Client - Loads FastMCP tools via the Model Context Protocol.
"""
from typing import List
from langchain_core.tools import BaseTool
from fastmcp.client import FastMCPTransport
from langchain_mcp_adapters.tools import load_mcp_tools
from .mcp_server import mcp

RECOMMENDATION_TOOL_NAMES = [
    "fetch_live_menu",
    "filter_menu_by_budget",
]

CART_TOOL_NAMES = [
    "add_item_to_cart",
    "remove_item_from_cart",
    "set_cart_item_quantity",
    "clear_user_cart",
    "fetch_live_menu",
    "get_user_cart",
]

ORDER_TOOL_NAMES = [
    "get_user_orders",
    "place_order",
    "cancel_order",
    "get_saved_addresses",
    "save_user_address",
    "delete_user_address",
    "verify_order_payment",
    "fetch_live_menu",
    "add_item_to_cart",
    "set_cart_item_quantity",
    "get_user_cart",
]

_session_cm = None
_tools: dict[str, BaseTool] = {}


async def init_mcp_client() -> dict[str, BaseTool]:
    """Connects to the FastMCP server and loads all registered tools."""
    global _session_cm, _tools
    if not _tools:
        _session_cm = FastMCPTransport(mcp).connect_session()
        session = await _session_cm.__aenter__()
        await session.initialize()
        tools = await load_mcp_tools(session)
        _tools = {t.name: t for t in tools}
    return _tools


async def close_mcp_client():
    """Disconnects the FastMCP client session."""
    global _session_cm, _tools
    if _session_cm:
        await _session_cm.__aexit__(None, None, None)
        _session_cm = None
        _tools = {}


async def get_tools_by_names(names: List[str]) -> List[BaseTool]:
    """Retrieves tools matching the given list of names."""
    if not _tools:
        await init_mcp_client()
    return [_tools[name] for name in names if name in _tools]


async def get_recommendation_tools() -> List[BaseTool]:
    return await get_tools_by_names(RECOMMENDATION_TOOL_NAMES)


async def get_cart_tools() -> List[BaseTool]:
    return await get_tools_by_names(CART_TOOL_NAMES)


async def get_order_tools() -> List[BaseTool]:
    return await get_tools_by_names(ORDER_TOOL_NAMES)
