from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, START, END
from .state import AgentState
from .supervisor import supervisor_node, extract_text_from_message
from langgraph.checkpoint.memory import InMemorySaver
from .sub_agents import (
    get_recommendation_agent,
    get_cart_agent,
    get_order_support_agent,
)
from mcp_tools import set_active_token


def filter_clean_history(messages):
    """Filters conversation history to clean Human and AI text messages for subagents."""
    clean = []
    for msg in messages:
        if isinstance(msg, HumanMessage) or (hasattr(msg, "type") and msg.type == "human"):
            txt = extract_text_from_message(getattr(msg, "content", ""))
            if txt and txt.strip():
                clean.append(HumanMessage(content=txt.strip()))
        elif isinstance(msg, AIMessage) or (hasattr(msg, "type") and msg.type == "ai"):
            txt = extract_text_from_message(getattr(msg, "content", ""))
            if txt and txt.strip():
                clean.append(AIMessage(content=txt.strip()))
    return clean


async def run_recommendation_node(state: AgentState) -> dict:
    clean_history = filter_clean_history(state.get("messages", []))
    agent_input = {"messages": clean_history}
    agent = await get_recommendation_agent()
    try:
        result = await agent.ainvoke(agent_input)
        input_len = len(clean_history)
        new_messages = result.get("messages", [])[input_len:]
        return {"messages": new_messages}
    except Exception as e:
        print(f"Error in recommendation_agent: {e}")
        fallback_msg = AIMessage(
            content="I'm having trouble fetching menu recommendations right now. Please try again or browse our menu categories!"
        )
        return {"messages": [fallback_msg]}


async def run_cart_node(state: AgentState) -> dict:
    user_jwt = state.get("user_jwt", "")
    clean_history = filter_clean_history(state.get("messages", []))

    if user_jwt:
        set_active_token(user_jwt)
        auth_msg = SystemMessage(
            content="User is authenticated. Cart tools automatically operate on their active account without needing token parameters."
        )
    else:
        set_active_token("")
        auth_msg = SystemMessage(
            content="User is NOT currently authenticated. If the user requests cart modifications, politely ask them to log in first."
        )

    agent_input = {"messages": [auth_msg] + clean_history}
    agent = await get_cart_agent()
    try:
        result = await agent.ainvoke(agent_input)
        input_len = len(agent_input["messages"])
        new_messages = result.get("messages", [])[input_len:]
        return {"messages": new_messages}
    except Exception as e:
        print(f"Error in cart_agent: {e}")
        fallback_msg = AIMessage(
            content="I encountered an issue updating your cart. Please ensure you are logged in and try again."
        )
        return {"messages": [fallback_msg]}


async def run_order_node(state: AgentState) -> dict:
    user_jwt = state.get("user_jwt", "")
    clean_history = filter_clean_history(state.get("messages", []))

    if user_jwt:
        set_active_token(user_jwt)
        auth_msg = SystemMessage(
            content="User is authenticated. Order, address, and payment tools automatically operate on their active account without needing token parameters."
        )
    else:
        set_active_token("")
        auth_msg = SystemMessage(
            content="User is NOT currently authenticated. If the user requests order details, order placement, or address operations, politely ask them to log in first."
        )

    agent_input = {"messages": [auth_msg] + clean_history}
    agent = await get_order_support_agent()
    try:
        result = await agent.ainvoke(agent_input)
        input_len = len(agent_input["messages"])
        new_messages = result.get("messages", [])[input_len:]
        return {"messages": new_messages}
    except Exception as e:
        print(f"Error in order_support_agent: {e}")
        fallback_msg = AIMessage(
            content="I encountered an issue processing your order request. Please check your order details or try again."
        )
        return {"messages": [fallback_msg]}


# Construct LangGraph StateGraph
workflow = StateGraph(AgentState)

# Add Supervisor & Sub-Agent Nodes
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("recommendation_agent", run_recommendation_node)
workflow.add_node("cart_agent", run_cart_node)
workflow.add_node("order_support_agent", run_order_node)

# Set Entry Point
workflow.add_edge(START, "supervisor")


# Define Routing Edges
def route_next(state: AgentState):
    next_node = state.get("next_agent")
    if next_node in ["recommendation_agent", "cart_agent", "order_support_agent"]:
        return next_node
    return END


workflow.add_conditional_edges(
    "supervisor",
    route_next,
    {
        "recommendation_agent": "recommendation_agent",
        "cart_agent": "cart_agent",
        "order_support_agent": "order_support_agent",
        END: END,
    }
)

# Set End Transitions
workflow.add_edge("recommendation_agent", END)
workflow.add_edge("cart_agent", END)
workflow.add_edge("order_support_agent", END)

# Compile Orchestration Graph
checkpointer = InMemorySaver()
agent_graph = workflow.compile(checkpointer=checkpointer)
