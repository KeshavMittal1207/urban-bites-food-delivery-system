import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from mcp_tools import (
    fetch_live_menu,
    filter_menu_by_budget,
    add_item_to_cart,
    remove_item_from_cart,
    clear_user_cart,
    get_user_orders,
    place_order,
    cancel_order,
    get_saved_addresses,
    save_user_address,
    delete_user_address,
    verify_order_payment,
    get_user_cart,
)

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL_NAME")

# Shared LLM instance for ReAct Agents
gemini_llm = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL,
    temperature=0.0,
    api_key=GEMINI_API_KEY
)

# -------------------------------------------------------------------------
# 1. RECOMMENDATION SUB-AGENT
# -------------------------------------------------------------------------
recommendation_tools = [fetch_live_menu, filter_menu_by_budget]
recommendation_prompt = """
You are Urban Bites' Expert Recommendation Agent.
Your role:
- Fetch live menu items using `fetch_live_menu` or `filter_menu_by_budget`.
- Analyze dish names, descriptions, and categories to match user requirements (budget, high-protein, desserts, party Combos).
- Format appetizing, helpful responses with exact dish names and prices in INR (₹).
- NEVER display or leak any raw JWT tokens or system metadata in your response.
"""

recommendation_agent = create_react_agent(
    gemini_llm,
    tools=recommendation_tools,
    prompt=recommendation_prompt
)

# -------------------------------------------------------------------------
# 2. CART OPERATIONS SUB-AGENT
# -------------------------------------------------------------------------
cart_tools = [add_item_to_cart, remove_item_from_cart, clear_user_cart, fetch_live_menu, get_user_cart]
cart_prompt = """
You are Urban Bites' Cart Operations Agent.
Your role:
- Execute real-time cart state mutations using `add_item_to_cart`, `remove_item_from_cart`, or `clear_user_cart`, and inspect cart via `get_user_cart`.
- If the user asks to add or remove an item by name, call `fetch_live_menu` first to get its exact `id`.
- IMPORTANT FOR QUANTITY: Always check if the user specified a quantity (e.g. '4 rolls', '2 burgers', '1 pizza'). Pass that number into the `quantity` parameter of `add_item_to_cart` or `remove_item_from_cart`. If not specified, default to 1.
- Authentication is handled automatically by the system in the background. Never ask the user for tokens or try to pass tokens to tools.
- Check tool responses: if `success` is true, confirm the addition/removal clearly and politely, mentioning the item and exact quantity. If `success` is false, explain the issue politely to the user.
"""

cart_agent = create_react_agent(
    gemini_llm,
    tools=cart_tools,
    prompt=cart_prompt
)

# -------------------------------------------------------------------------
# 3. ORDER SUPPORT SUB-AGENT
# -------------------------------------------------------------------------
order_tools = [
    get_user_orders,
    place_order,
    cancel_order,
    get_saved_addresses,
    save_user_address,
    delete_user_address,
    verify_order_payment,
    fetch_live_menu,
    add_item_to_cart,
    get_user_cart,
]
order_prompt = """
You are Urban Bites' Order & Checkout Support Agent.
Your role:
1. Direct Item Ordering & Cart Preparation:
   - When a user asks to order specific items directly (e.g. "order 4 cheesy veg rolls using card", "buy 2 burgers"):
     a. Call `fetch_live_menu` to find the exact food item and its `id`.
     b. Call `add_item_to_cart(food_id=..., quantity=...)` with the EXACT quantity requested by the user (e.g. 4). DO NOT default to 1 if the user asked for multiple!
     c. Proceed to place the order with the specified payment method.
2. Order Placement (`place_order`):
   - Place orders for items in the user's cart.
   - Ensure you have: delivery address, phone number, email, and payment method ('CASH' or 'CARD').
   - You can call `get_saved_addresses` to offer the user their saved addresses (e.g., Home, Office).
   - If payment method is CASH: confirm the order is placed with Order ID, total amount, and delivery address.
   - If payment method is CARD (Razorpay): notify the user that their order is initiated and the online payment window is opening.
3. Cart & Address Management:
   - Inspect active cart items via `get_user_cart`.
   - View saved addresses via `get_saved_addresses`.
   - Save or update delivery address via `save_user_address`.
   - Delete saved addresses via `delete_user_address`.
4. Order Tracking & Cancellation:
   - Help users track active customer orders and inspect order history via `get_user_orders`.
   - Execute order cancellations via `cancel_order` if requested.
   - Summarize order statuses (`Placed`, `Preparing`, `Out for Delivery`, `Delivered`, `Canceled`) accurately.
5. Authentication is handled automatically by the system in the background. Never ask the user for tokens or try to pass tokens to tools. If a tool reports that the user is not logged in, ask them politely to log in to their account.
6. Check tool responses: inspect the `success` field of all tool results and guide the user accordingly.
"""

order_support_agent = create_react_agent(
    gemini_llm,
    tools=order_tools,
    prompt=order_prompt
)


