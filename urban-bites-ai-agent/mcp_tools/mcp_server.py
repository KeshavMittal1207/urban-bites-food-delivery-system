import os
import contextvars
import requests
from dotenv import load_dotenv
from fastmcp import FastMCP

load_dotenv()

SPRING_BOOT_URL = os.getenv("SPRING_BOOT_BACKEND_URL").rstrip("/")

# Initialize FastMCP Server
mcp = FastMCP("Urban Bites MCP Server")

# Session context variable to store the authenticated user's JWT token for the current request
current_user_jwt: contextvars.ContextVar[str] = contextvars.ContextVar("current_user_jwt", default="")


def set_active_token(token: str):
    """Stores the active user's JWT token in the session context."""
    if token:
        cleaned = str(token).strip()
        if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
            cleaned = cleaned[1:-1].strip()
        while cleaned.lower().startswith("bearer "):
            cleaned = cleaned[7:].strip()
        current_user_jwt.set(cleaned)
    else:
        current_user_jwt.set("")


def get_auth_header() -> dict:
    """Retrieves and normalizes the Authorization header from the active session context."""
    token = current_user_jwt.get("")
    if not token or token.lower() in ["none", "null", "undefined", ""]:
        return {}
    return {"Authorization": f"Bearer {token}"}


@mcp.tool()
def fetch_live_menu() -> dict:
    """Fetches the complete active food menu with item IDs, dish names, prices, categories, and descriptions."""
    try:
        response = requests.get(f"{SPRING_BOOT_URL}/api/foods/getAll", timeout=10)
        if response.status_code == 200:
            return {"success": True, "items": response.json()}
        return {"success": False, "error": f"Failed to fetch live menu. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Backend connection failed: {str(e)}"}


@mcp.tool()
def filter_menu_by_budget(max_budget: float, category: str = None) -> dict:
    """Filters live menu items by maximum budget (in INR) and optional category name."""
    try:
        response = requests.get(f"{SPRING_BOOT_URL}/api/foods/getAll", timeout=10)
        if response.status_code != 200:
            return {"success": False, "error": f"Failed to fetch menu items. Status {response.status_code}"}
        menu = response.json()
        filtered = [item for item in menu if item.get("price", 0) <= max_budget]
        if category:
            filtered = [item for item in filtered if category.lower() in item.get("category", "").lower()]
        return {"success": True, "count": len(filtered), "items": filtered}
    except Exception as e:
        return {"success": False, "error": f"Backend connection failed: {str(e)}"}


@mcp.tool()
def get_user_cart() -> dict:
    """Fetches all food items and their respective quantities currently present in the user's active shopping cart."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to your Urban Bites account to view your cart."}

    try:
        response = requests.get(f"{SPRING_BOOT_URL}/api/cart/getCart", headers=headers, timeout=10)
        if response.status_code == 200:
            return {"success": True, "cart": response.json()}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Your login session has expired. Please log out and sign in again."}
        return {"success": False, "error": f"Failed to fetch user cart. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Cart API: {str(e)}"}


@mcp.tool()
def add_item_to_cart(food_id: str, quantity: int = 1) -> dict:
    """Adds a specific food item ID to the user's active cart with the specified quantity (e.g. 1, 2, 4). Default is 1."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to your Urban Bites account to add items to your cart."}

    qty = max(1, int(quantity)) if quantity else 1
    payload = {"foodId": food_id, "quantity": qty}
    try:
        response = requests.post(f"{SPRING_BOOT_URL}/api/cart/addToCart", json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            data = response.json()
            # If connected to a backend that only incremented by 1, fulfill remaining count
            if qty > 1 and isinstance(data, dict) and "items" in data:
                current_qty = data["items"].get(food_id, 0)
                if current_qty < qty:
                    needed = qty - current_qty
                    for _ in range(needed):
                        sub_res = requests.post(f"{SPRING_BOOT_URL}/api/cart/addToCart", json={"foodId": food_id}, headers=headers, timeout=10)
                        if sub_res.status_code in [200, 201]:
                            data = sub_res.json()
            return {"success": True, "message": f"Successfully added {qty} item(s) to your cart.", "cart": data}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Your login session has expired. Please log out and sign in again."}
        return {"success": False, "error": f"Failed to add to cart. Server returned status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Cart API: {str(e)}"}


@mcp.tool()
def remove_item_from_cart(food_id: str, quantity: int = 1) -> dict:
    """Removes a specific food item ID or reduces its quantity from the user's active cart. Default quantity is 1."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to modify your cart."}

    qty = max(1, int(quantity)) if quantity else 1
    payload = {"foodId": food_id, "quantity": qty}
    try:
        response = requests.post(f"{SPRING_BOOT_URL}/api/cart/removeFromCart", json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            return {"success": True, "message": f"Successfully removed {qty} item(s) from your cart.", "cart": response.json()}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Please log in again."}
        return {"success": False, "error": f"Failed to remove from cart. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Cart API: {str(e)}"}


@mcp.tool()
def clear_user_cart() -> dict:
    """Clears all food items from the user's active shopping cart."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to clear your cart."}

    try:
        response = requests.delete(f"{SPRING_BOOT_URL}/api/cart/deleteCart", headers=headers, timeout=10)
        if response.status_code in [200, 204]:
            return {"success": True, "message": "Cart cleared successfully."}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Please log in again."}
        return {"success": False, "error": f"Failed to clear cart. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Cart API: {str(e)}"}


@mcp.tool()
def get_user_orders() -> dict:
    """Fetches all customer order history and active order tracking details."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to view your orders."}

    try:
        response = requests.get(f"{SPRING_BOOT_URL}/api/orders/myorders", headers=headers, timeout=10)
        if response.status_code == 200:
            return {"success": True, "orders": response.json()}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Please log in again."}
        return {"success": False, "error": f"Failed to fetch user orders. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Order API: {str(e)}"}


@mcp.tool()
def cancel_order(order_id: str) -> dict:
    """Cancels an existing placed customer order by order ID."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to cancel an order."}

    try:
        response = requests.post(f"{SPRING_BOOT_URL}/api/orders/{order_id}/cancel", headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            return {"success": True, "message": f"Order #{order_id} was successfully cancelled.", "order": response.json()}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Please log in again."}
        return {"success": False, "error": f"Failed to cancel order. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Cancel Order API: {str(e)}"}


@mcp.tool()
def place_order(address: str, phoneNumber: str, email: str, paymentMethod: str) -> dict:
    """Places an order for all items present in the user's active cart. paymentMethod must be 'CASH' or 'CARD'."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to place an order."}

    payload = {
        "address": address,
        "phoneNumber": phoneNumber,
        "email": email,
        "paymentMethod": paymentMethod.upper()
    }
    try:
        response = requests.post(f"{SPRING_BOOT_URL}/api/orders/place", json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            data = response.json()
            return {
                "success": True,
                "orderId": data.get("id"),
                "razorpayOrderId": data.get("razorpayOrderId"),
                "razorpayKeyId": data.get("razorpayKeyId"),
                "amount": data.get("amount"),
                "paymentMethod": paymentMethod.upper(),
                "address": address,
                "phoneNumber": phoneNumber,
                "email": email,
                "order": data
            }
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Please log in again to place your order."}
        return {"success": False, "error": f"Failed to place order. Status {response.status_code}: {response.text}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to Connect to Place Order API: {str(e)}"}


@mcp.tool()
def get_saved_addresses() -> dict:
    """Fetches the user's saved delivery addresses (e.g. Home, Office, Other)."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to view saved addresses."}

    try:
        response = requests.get(f"{SPRING_BOOT_URL}/api/addresses", headers=headers, timeout=10)
        if response.status_code == 200:
            return {"success": True, "addresses": response.json()}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Please log in again."}
        return {"success": False, "error": f"Failed to fetch saved addresses. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Address API: {str(e)}"}


@mcp.tool()
def save_user_address(address_type: str, address: str) -> dict:
    """Saves or updates a user delivery address under a label like 'Home', 'Office', or 'Other'."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to save an address."}

    payload = {"type": address_type, "address": address}
    try:
        response = requests.post(f"{SPRING_BOOT_URL}/api/addresses", json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            return {"success": True, "message": f"Saved delivery address under '{address_type}'.", "addresses": response.json()}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Please log in again."}
        return {"success": False, "error": f"Failed to save address. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Address API: {str(e)}"}


@mcp.tool()
def delete_user_address(address_type: str) -> dict:
    """Deletes a saved delivery address by type label (e.g. 'Home', 'Office')."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to delete an address."}

    try:
        response = requests.delete(f"{SPRING_BOOT_URL}/api/addresses/{address_type}", headers=headers, timeout=10)
        if response.status_code in [200, 204]:
            return {"success": True, "message": f"Address '{address_type}' deleted successfully."}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Please log in again."}
        return {"success": False, "error": f"Failed to delete address. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Address API: {str(e)}"}


@mcp.tool()
def verify_order_payment(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> dict:
    """Verifies a completed Razorpay online payment signature for an order."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to verify payments."}

    payload = {
        "razorpayOrderId": razorpay_order_id,
        "razorpayPaymentId": razorpay_payment_id,
        "razorpaySignature": razorpay_signature
    }
    try:
        response = requests.post(f"{SPRING_BOOT_URL}/api/orders/verify", json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            return {"success": True, "message": "Payment verified successfully.", "order": response.json()}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Please log in again."}
        return {"success": False, "error": f"Payment verification failed. Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Payment Verification API: {str(e)}"}
