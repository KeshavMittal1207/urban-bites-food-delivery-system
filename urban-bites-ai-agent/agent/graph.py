from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, START, END
from .state import AgentState
from .supervisor import supervisor_node
from langgraph.checkpoint.memory import InMemorySaver
from .sub_agents import recommendation_agent, cart_agent, order_support_agent

def run_recommendation_node(state: AgentState) -> dict:
    result = recommendation_agent.invoke(state)
    return {"messages": result["messages"]}

def run_cart_node(state: AgentState) -> dict:
    user_jwt = state.get("user_jwt", "")
    messages = list(state.get("messages", []))
    
    if user_jwt:
        from mcp_tools import set_active_token
        set_active_token(user_jwt)
        auth_msg = SystemMessage(
            content="User is authenticated. Cart tools automatically operate on their active account without needing token parameters."
        )
    else:
        auth_msg = SystemMessage(
            content="User is NOT currently authenticated. If the user requests cart modifications, politely ask them to log in first."
        )
    
    agent_input = {
        "messages": [auth_msg] + messages
    }
    result = cart_agent.invoke(agent_input)
    return {"messages": result["messages"]}

def run_order_node(state: AgentState) -> dict:
    user_jwt = state.get("user_jwt", "")
    messages = list(state.get("messages", []))
    
    if user_jwt:
        from mcp_tools import set_active_token
        set_active_token(user_jwt)
        auth_msg = SystemMessage(
            content="User is authenticated. Order, address, and payment tools automatically operate on their active account without needing token parameters."
        )
    else:
        auth_msg = SystemMessage(
            content="User is NOT currently authenticated. If the user requests order details, order placement, or address operations, politely ask them to log in first."
        )
    
    agent_input = {
        "messages": [auth_msg] + messages
    }
    result = order_support_agent.invoke(agent_input)
    return {"messages": result["messages"]}

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
        END: END
    }
)

# Set End Transitions
workflow.add_edge("recommendation_agent", END)
workflow.add_edge("cart_agent", END)
workflow.add_edge("order_support_agent", END)

# Compile Orchestration Graph
checkpointer = InMemorySaver()
agent_graph = workflow.compile(checkpointer=checkpointer)
