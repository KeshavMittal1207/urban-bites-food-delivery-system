import re
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from .state import AgentState
from .llm import get_chat_llm, get_structured_router_llm


class RouteResponse(BaseModel):
    next_agent: str = Field(
        description="Must be one of: 'recommendation_agent', 'cart_agent', 'order_support_agent', or 'general_assistant'."
    )
    reasoning: str = Field(description="Brief explanation for the routing decision.")


structured_router = get_structured_router_llm(RouteResponse)

SUPERVISOR_SYSTEM_PROMPT = """
You are the Supervisor Router Agent for Urban Bites AI, an online food ordering platform.
Your job is to inspect the user's latest query and conversation history, and route the state to the most appropriate specialized sub-agent:

Routing Rules:
1. 'recommendation_agent': For queries asking for food recommendations, menu exploration, budget planning, dietary preferences (veg, high-protein, desserts), or dish details.
2. 'cart_agent': For requests to add items to cart, remove items from cart, clear cart, or view current cart items.
3. 'order_support_agent': For placing orders, checkout (Cash on Delivery or Online/Razorpay), checking saved delivery addresses, saving/deleting addresses, tracking placed orders, order status, or order cancellation.
   CRITICAL FOR MULTI-TURN CHECKOUT:
   If the conversation is in the process of ordering, checkout, or cart preparation, and the user provides details such as:
   - Phone number (e.g. 10-digit number like "8700007777")
   - Email address (e.g. "user@example.com")
   - Payment method (e.g. "CARD", "CASH", "COD", "Razorpay")
   - Delivery address or address confirmation
   You MUST route to 'order_support_agent' so it can complete the order placement!
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


def extract_text_from_message(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join([b.get("text", "") if isinstance(b, dict) else str(b) for b in content])
    if isinstance(content, dict):
        return content.get("text", str(content))
    return str(content or "")


def classify_intent_heuristic(user_text: str) -> str:
    t = user_text.lower().strip()

    # 1. Cart mutations and inspections
    if any(k in t for k in [
        'cart', 'add to cart', 'remove from cart', 'clear cart',
        'delete from cart', 'empty cart', 'in my cart', 'my cart',
        'items in cart', 'view cart', 'show cart'
    ]):
        return 'cart_agent'

    # 2. Orders, Checkout, Delivery Addresses, Tracking, Payment
    if any(k in t for k in [
        'place order', 'checkout', 'buy now', 'order now', 'confirm order',
        'my order', 'track order', 'cancel order', 'order status', 'order history',
        'delivery address', 'saved address', 'save address', 'delete address',
        'razorpay', 'pay with', 'cash on delivery', 'cod', 'card payment', 'online payment',
        'card', 'cash'
    ]):
        return 'order_support_agent'
    if re.search(r'\b(order|buy)\s+\d+', t) or re.search(r'\b(order|buy)\s+[a-z]+', t):
        return 'order_support_agent'

    # Follow-up contact info provided during order checkout (email, phone, payment terms)
    has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', t))
    has_phone = bool(re.search(r'\b\d{10}\b', t)) or any(k in t for k in ['phone', 'mobile', 'contact'])
    if has_email or has_phone:
        return 'order_support_agent'

    # 3. Recommendations & Menu exploration
    if any(k in t for k in [
        'recommend', 'suggestion', 'suggest', 'menu', 'food', 'dish', 'dishes',
        'budget', 'under ₹', 'under rs', 'under ', 'cheap', 'cost', 'price',
        'veg', 'vegetarian', 'non-veg', 'paneer', 'pizza', 'burger', 'biryani',
        'dessert', 'drink', 'beverage', 'snack', 'dinner', 'lunch', 'breakfast',
        'combo', 'popular', 'what can i eat', 'what should i order'
    ]):
        return 'recommendation_agent'

    # 4. General / Greeting / Off-topic
    return 'general_assistant'


def supervisor_node(state: AgentState) -> dict:
    messages = state.get("messages", [])

    # Extract clean conversation messages (Human & AI text) to prevent tool-message schema errors
    clean_history = []
    latest_user_text = ""
    for msg in messages:
        if isinstance(msg, HumanMessage) or (hasattr(msg, "type") and msg.type == "human"):
            txt = extract_text_from_message(getattr(msg, "content", ""))
            if txt and txt.strip():
                clean_history.append(HumanMessage(content=txt.strip()))
                latest_user_text = txt.strip()
        elif isinstance(msg, AIMessage) or (hasattr(msg, "type") and msg.type == "ai"):
            txt = extract_text_from_message(getattr(msg, "content", ""))
            if txt and txt.strip():
                clean_history.append(AIMessage(content=txt.strip()))

    conversation_prompt = [SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT)] + clean_history

    next_target = None
    try:
        decision = structured_router.invoke(conversation_prompt)
        if hasattr(decision, "next_agent"):
            next_target = decision.next_agent
        elif isinstance(decision, dict) and "next_agent" in decision:
            next_target = decision["next_agent"]
    except Exception as e:
        print(f"Supervisor structured routing error, using heuristic fallback: {e}")

    # Fallback to heuristic intent classifier if structured routing fails or returns unknown agent
    valid_agents = ["recommendation_agent", "cart_agent", "order_support_agent", "general_assistant"]
    if next_target not in valid_agents:
        next_target = classify_intent_heuristic(latest_user_text)

    if next_target in ["general_assistant", "FINISH"]:
        try:
            general_llm = get_chat_llm(temperature=0.2)
            gen_prompt = [SystemMessage(content=GENERAL_ASSISTANT_SYSTEM_PROMPT)] + clean_history
            response = general_llm.invoke(gen_prompt)
            return {
                "messages": [response],
                "next_agent": "SupervisorRouter"
            }
        except Exception as e:
            print(f"General assistant response fallback: {e}")
            fallback_msg = AIMessage(
                content="Hello! 👋 Welcome to Urban Bites! How can I help you today? You can ask for food recommendations under your budget, add items to your cart, or track your orders."
            )
            return {
                "messages": [fallback_msg],
                "next_agent": "SupervisorRouter"
            }

    return {"next_agent": next_target}
