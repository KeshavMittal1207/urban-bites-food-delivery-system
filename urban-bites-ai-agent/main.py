import ast
import json
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from agent.graph import agent_graph
from mcp_tools import init_mcp_client, close_mcp_client, set_active_token


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the FastMCP Client Session via MCP Protocol
    await init_mcp_client()
    yield
    # Gracefully disconnect the MCP session on application shutdown
    await close_mcp_client()


app = FastAPI(
    title="Urban Bites Multi-Agent AI Microservice",
    description="LangGraph Multi-Agent System with FastMCP Protocol Tools for Urban Bites",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


import base64
from typing import Optional

class ChatRequest(BaseModel):
    prompt: str
    token: Optional[str] = None


def normalize_token(auth_header: Optional[str] = None, body_token: Optional[str] = None) -> str:
    raw = auth_header or body_token or ""
    if not raw:
        return ""
    cleaned = str(raw).strip()
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
        cleaned = cleaned[1:-1].strip()
    while cleaned.lower().startswith("bearer "):
        cleaned = cleaned[7:].strip()
    if cleaned.lower() in ["none", "null", "undefined", ""]:
        return ""
    return cleaned


def get_session_thread_id(token: str) -> str:
    if not token:
        return "guest_session"
    try:
        parts = token.split(".")
        if len(parts) >= 2:
            payload_b64 = parts[1]
            rem = len(payload_b64) % 4
            if rem > 0:
                payload_b64 += "=" * (4 - rem)
            data = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
            sub = data.get("sub")
            if sub:
                return f"user_{sub}"
    except Exception:
        pass
    return token[:40]


import os

def extract_payment_data(messages) -> Optional[dict]:
    """Robustly extracts Razorpay payment checkout details ONLY from new order placement tool execution messages."""
    for msg in reversed(messages):
        # 1. Skip if this message is from cancel_order, get_user_orders, etc.
        msg_name = getattr(msg, "name", "")
        if msg_name and msg_name != "place_order":
            continue

        contents_to_check = []
        raw_content = getattr(msg, "content", None)
        if isinstance(raw_content, list):
            for block in raw_content:
                if isinstance(block, dict):
                    if "text" in block and block["text"]:
                        contents_to_check.append(block["text"])
                    contents_to_check.append(block)
                elif isinstance(block, str) and block:
                    contents_to_check.append(block)
        elif raw_content is not None:
            contents_to_check.append(raw_content)

        artifact = getattr(msg, "artifact", None)
        if artifact is not None:
            contents_to_check.append(artifact)

        for item in contents_to_check:
            # 2. Skip if the content explicitly indicates order cancellation or refund
            item_str = str(item).lower()
            if "cancel" in item_str or "refund" in item_str:
                continue

            parsed = None
            if isinstance(item, dict):
                parsed = item
            elif isinstance(item, str) and ("razorpayOrderId" in item or "orderId" in item):
                try:
                    parsed = json.loads(item)
                except Exception:
                    try:
                        parsed = ast.literal_eval(item)
                    except Exception:
                        pass

            if isinstance(parsed, dict):
                nested = parsed.get("order") if isinstance(parsed.get("order"), dict) else parsed

                # 3. Check order status, payment status, and payment method
                order_status = str(nested.get("orderStatus") or parsed.get("orderStatus") or "").upper()
                payment_status = str(nested.get("paymentStatus") or parsed.get("paymentStatus") or "").upper()
                payment_method = str(nested.get("paymentMethod") or parsed.get("paymentMethod") or "").upper()

                if order_status in ["CANCELED", "CANCELLED"]:
                    continue
                if payment_status in ["REFUNDED", "PAID"]:
                    continue
                if payment_method == "CASH":
                    continue

                r_order_id = parsed.get("razorpayOrderId") or nested.get("razorpayOrderId")
                if r_order_id:
                    key_id = (
                        parsed.get("razorpayKeyId")
                        or nested.get("razorpayKeyId")
                        or os.getenv("RAZORPAY_TEST_ID", "rzp_test_TEwBlUHYk11TbB")
                    )
                    return {
                        "orderId": parsed.get("orderId") or nested.get("id") or parsed.get("id"),
                        "razorpayOrderId": r_order_id,
                        "razorpayKeyId": key_id,
                        "amount": parsed.get("amount") or nested.get("amount"),
                        "email": parsed.get("email") or nested.get("email"),
                        "phoneNumber": parsed.get("phoneNumber") or nested.get("phoneNumber"),
                        "address": parsed.get("address") or nested.get("address"),
                        "orderStatus": order_status,
                        "paymentStatus": payment_status,
                    }
    return None


def extract_text_from_message(content) -> str:
    """Safely extracts text string from string, block-list, or dict message content."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join([b.get("text", "") if isinstance(b, dict) else str(b) for b in content])
    if isinstance(content, dict):
        return content.get("text", str(content))
    return str(content or "")


@app.api_route("/" , methods=["GET" , "HEAD"])
def health_check():
    return {
        "status": "online",
        "service": "Urban Bites Multi-Agent AI Microservice",
        "model": "OpenRouter nvidia/nemotron-3-super-120b-a12b:free (with automated fallback)",
        "protocol": "Model Context Protocol (FastMCP)",
        "agents": ["SupervisorRouter", "RecommendationAgent", "CartAgent", "OrderSupportAgent"]
    }


@app.post("/api/agent/chat")
async def chat_with_multi_agent(request: ChatRequest, authorization: str = Header(None)):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt message cannot be empty")

    token = normalize_token(authorization, request.token)
    set_active_token(token)

    user_prompt = request.prompt.strip()

    initial_state = {
        "messages": [HumanMessage(content=user_prompt)],
        "next_agent": None,
        "user_jwt": token
    }

    try:
        thread_id = get_session_thread_id(token)
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
        final_state = await agent_graph.ainvoke(initial_state, config=config)

        # Safely extract the AI reply: find the last AI message with actual non-empty text content
        ai_reply = None
        for msg in reversed(final_state.get("messages", [])):
            if isinstance(msg, AIMessage) or (hasattr(msg, "type") and getattr(msg, "type") == "ai"):
                extracted = extract_text_from_message(getattr(msg, "content", ""))
                if extracted and extracted.strip():
                    ai_reply = extracted.strip()
                    break

        if not ai_reply:
            ai_reply = "Hello! I am your Urban Bites Food Assistant. How can I help you explore our menu, manage your cart, or track your orders today?"

        routed_agent = final_state.get("next_agent") or "SupervisorRouter"
        if routed_agent in ["general_assistant", "supervisor", "FINISH"]:
            routed_agent = "SupervisorRouter"

        # Check for Razorpay payment details in tool messages
        payment_data = extract_payment_data(final_state.get("messages", []))

        return {
            "reply": str(ai_reply),
            "routed_agent": routed_agent,
            "payment_data": payment_data,
            "status": "success"
        }
    except Exception as e:
        print(f"Error processing Multi-Agent workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Multi-Agent Execution Error: {str(e)}")


@app.get("/api/agent/history")
async def get_chat_history(authorization: str = Header(None)):
    token = normalize_token(authorization)
    thread_id = get_session_thread_id(token)
    config: RunnableConfig = {"configurable": {"thread_id": thread_id}}

    state = agent_graph.get_state(config)
    messages = []
    if state and state.values and "messages" in state.values:
        for msg in state.values["messages"]:
            if hasattr(msg, "type") and getattr(msg, "type") in ["human", "ai"]:
                text_content = extract_text_from_message(getattr(msg, "content", ""))
                # Only include messages that have actual text (skip intermediate tool calls)
                if text_content and text_content.strip():
                    sender = "user" if getattr(msg, "type") == "human" else "ai"
                    messages.append({
                        "sender": sender,
                        "text": text_content.strip(),
                        "agent": "SupervisorRouter" if sender == "ai" else None
                    })
    return {"history": messages}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
