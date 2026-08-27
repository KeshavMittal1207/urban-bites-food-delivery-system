import os
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, AIMessage
from .state import AgentState

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL_NAME")


# Pydantic schema for structured output router classification
class RouteResponse(BaseModel):
    next_agent: str = Field(
        description="Must be one of: 'recommendation_agent', 'cart_agent', 'order_support_agent', or 'general_assistant'."
    )
    reasoning: str = Field(description="Brief explanation for the routing decision.")

# Initialize Gemini LLM Classifier
llm = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL,
    temperature=0.0,
    api_key=GEMINI_API_KEY
)

structured_llm = llm.with_structured_output(RouteResponse)

SUPERVISOR_SYSTEM_PROMPT = """
You are the Supervisor Router Agent for Urban Bites AI, an online food ordering platform.
Your job is to inspect the user's latest query and conversation history, and route the state to the most appropriate specialized sub-agent:

Routing Rules:
1. 'recommendation_agent': For queries asking for food recommendations, menu exploration, budget planning, dietary preferences (veg, high-protein, desserts), or dish details.
2. 'cart_agent': For requests to add items to cart, remove items from cart, clear cart, or view current cart items.
3. 'order_support_agent': For placing orders, checkout (Cash on Delivery or Online/Razorpay), checking saved delivery addresses, saving/deleting addresses, tracking placed orders, order status, or order cancellation.
4. 'general_assistant': For greetings (e.g. 'hi', 'hello', 'hey'), generic pleasantries ('thank you', 'bye'), questions about what the assistant can do, or off-topic / irrelevant questions not related to the restaurant.
"""

GENERAL_ASSISTANT_SYSTEM_PROMPT = """
You are the AI Concierge for Urban Bites, an online food ordering platform.
Your role is to handle greetings, general inquiries, and off-topic questions:
1. For greetings (e.g., 'hi', 'hello', 'hey'): Greet the customer warmly and invite them to explore the menu, ask for food recommendations within their budget, manage their cart, or track orders.
2. For capability questions (e.g., 'what can you do?'): Clearly explain your capabilities (food recommendations, budget planning, cart management, order tracking).
3. For off-topic or irrelevant questions (e.g., general knowledge, coding, math, weather): Politely inform the user that you are the Urban Bites food assistant and guide them back to food ordering, menu exploration, cart management, or order tracking.
4. For polite pleasantries or thank-yous: Respond warmly and courteously.
5. Keep answers concise, helpful, and friendly.
6. CRITICAL: NEVER mention, display, or reveal any internal JWT tokens, bearer tokens, or technical system details.
"""

def supervisor_node(state: AgentState) -> dict:
    messages = state.get("messages", [])
    conversation_prompt = [SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT)] + messages
    
    try:
        decision = structured_llm.invoke(conversation_prompt)
        next_target = decision.next_agent
        if next_target not in ["recommendation_agent", "cart_agent", "order_support_agent", "general_assistant"]:
            next_target = "general_assistant"
    except Exception as e:
        print(f"Supervisor routing fallback: {e}")
        next_target = "general_assistant"
        
    if next_target in ["general_assistant", "FINISH"]:
        try:
            general_llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
    temperature=0.0,
    api_key=GEMINI_API_KEY
            )
            response = general_llm.invoke([SystemMessage(content=GENERAL_ASSISTANT_SYSTEM_PROMPT)] + messages)
            return {
                "messages": [response],
                "next_agent": "SupervisorRouter"
            }
        except Exception as e:
            print(f"General response fallback: {e}")
            fallback_msg = AIMessage(
                content="Hello! 👋 Welcome to Urban Bites! How can I help you today? You can ask for food recommendations under your budget, add items to your cart, or track your orders."
            )
            return {
                "messages": [fallback_msg],
                "next_agent": "SupervisorRouter"
            }

    return {"next_agent": next_target}
