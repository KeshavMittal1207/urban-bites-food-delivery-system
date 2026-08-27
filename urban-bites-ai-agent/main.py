from langchain_core.runnables import RunnableConfig
import uvicorn
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage
from agent.graph import agent_graph

app = FastAPI(
    title="Urban Bites Multi-Agent AI Microservice",
    description="Gemini-Powered LangGraph Multi-Agent System with Custom FastMCP Tools for Urban Bites",
    version="1.0.0"
)

# Enable CORS for React frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Urban Bites Multi-Agent AI Microservice",
        "model": "Google Gemini 3.7 Flash",
        "agents": ["SupervisorRouter", "RecommendationAgent", "CartAgent", "OrderSupportAgent"]
    }

@app.post("/api/agent/chat")
async def chat_with_multi_agent(request: ChatRequest, authorization: str = Header(None)):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt message cannot be empty")
    
    token = ""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()

    user_prompt = request.prompt.strip()

    initial_state = {
        "messages": [HumanMessage(content=user_prompt)],
        "next_agent": None,
        "user_jwt": token
    }

    try:
        thread_id = token if token else "guest_session"
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
        final_state = agent_graph.invoke(initial_state, config=config)
        
        ai_reply = None
        for msg in reversed(final_state.get("messages", [])):
            if isinstance(msg, AIMessage) or (hasattr(msg, "type") and msg.type == "ai"):
                ai_reply = msg.content
                break
        
        if not ai_reply:
            ai_reply = "Hello! I am your Urban Bites Food Assistant. How can I help you explore our menu, manage your cart, or track your orders today?"

        if isinstance(ai_reply, list):
            ai_reply = "".join([b.get("text", str(b)) if isinstance(b, dict) else str(b) for b in ai_reply])

        routed_agent = final_state.get("next_agent") or "SupervisorRouter"
        if routed_agent in ["general_assistant", "supervisor", "FINISH"]:
            routed_agent = "SupervisorRouter"

        # Check for Razorpay payment details in tool messages
        payment_data = None
        for msg in final_state.get("messages", []):
            content = getattr(msg, "content", "")
            if isinstance(content, str) and "razorpayOrderId" in content and "razorpayKeyId" in content:
                try:
                    import json
                    parsed = json.loads(content)
                    if isinstance(parsed, dict) and parsed.get("razorpayOrderId"):
                        payment_data = {
                            "orderId": parsed.get("id"),
                            "razorpayOrderId": parsed.get("razorpayOrderId"),
                            "razorpayKeyId": parsed.get("razorpayKeyId"),
                            "amount": parsed.get("amount"),
                            "email": parsed.get("email"),
                            "phoneNumber": parsed.get("phoneNumber"),
                            "address": parsed.get("address")
                        }
                        break
                except Exception:
                    pass
            elif isinstance(content, dict) and content.get("razorpayOrderId"):
                payment_data = {
                    "orderId": content.get("id"),
                    "razorpayOrderId": content.get("razorpayOrderId"),
                    "razorpayKeyId": content.get("razorpayKeyId"),
                    "amount": content.get("amount"),
                    "email": content.get("email"),
                    "phoneNumber": content.get("phoneNumber"),
                    "address": content.get("address")
                }
                break

        return {
            "reply": str(ai_reply),
            "routed_agent": routed_agent,
            "payment_data": payment_data,
            "status": "success"
        }
    except Exception as e:
        print(f"Error processing Multi-Agent workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Multi-Agent Execution Error: {str(e)}")

def extract_text_from_message(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join([b.get("text", "") if isinstance(b, dict) else str(b) for b in content])
    if isinstance(content, dict):
        return content.get("text", str(content))
    return str(content or "")

@app.get("/api/agent/history")
async def get_chat_history(authorization: str = Header(None)):
    token = ""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
    elif authorization:
        token = authorization.strip()

    thread_id = token if token else "guest_session"
    config: RunnableConfig = {"configurable": {"thread_id": thread_id}}

    state = agent_graph.get_state(config)
    messages = []
    if state and state.values and "messages" in state.values:
        for msg in state.values["messages"]:
            if hasattr(msg, "type") and msg.type in ["human", "ai"]:
                text_content = extract_text_from_message(getattr(msg, "content", ""))
                # Only include messages that have actual text (skip intermediate tool calls)
                if text_content and text_content.strip():
                    sender = "user" if msg.type == "human" else "ai"
                    messages.append({
                        "sender": sender,
                        "text": text_content.strip(),
                        "agent": "SupervisorRouter" if sender == "ai" else None
                    })
    return {"history": messages}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
