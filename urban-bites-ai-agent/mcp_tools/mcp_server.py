import os
import contextvars
import requests
from dotenv import load_dotenv
from fastmcp import FastMCP

load_dotenv()

SPRING_BOOT_URL = (os.getenv("SPRING_BOOT_BACKEND_URL").rstrip("/"))

# Initialize FastMCP Server
mcp = FastMCP("Urban Bites MCP Server")

# Session context variable and global fallback to store the authenticated user's JWT token for the current request
current_user_jwt: contextvars.ContextVar[str] = contextvars.ContextVar("current_user_jwt", default="")
_active_jwt_global: str = ""


def set_active_token(token: str):
    """Stores the active user's JWT token in the session context and global fallback."""
    global _active_jwt_global
    if token:
        cleaned = str(token).strip()
        if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
            cleaned = cleaned[1:-1].strip()
        while cleaned.lower().startswith("bearer "):
            cleaned = cleaned[7:].strip()
        if cleaned.lower() in ["none", "null", "undefined", ""]:
            cleaned = ""
        current_user_jwt.set(cleaned)
        _active_jwt_global = cleaned
    else:
        current_user_jwt.set("")
        _active_jwt_global = ""


def clean_token(val) -> str:
    if not val:
        return ""
    cleaned = str(val).strip()
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
        cleaned = cleaned[1:-1].strip()
    while cleaned.lower().startswith("bearer "):
        cleaned = cleaned[7:].strip()
    if cleaned.lower() in ["none", "null", "undefined", ""]:
        return ""
    return cleaned


def get_auth_header(token_override: str = None) -> dict:
    """Retrieves and normalizes the Authorization header from context, override, or global fallback."""
    token = clean_token(token_override) or clean_token(current_user_jwt.get("")) or clean_token(_active_jwt_global) or clean_token(os.getenv("URBAN_BITES_JWT", ""))
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


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
    clean_id = str(food_id).strip()
    payload = {"foodId": clean_id, "quantity": qty}
    try:
        response = requests.post(f"{SPRING_BOOT_URL}/api/cart/addToCart", json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            return {"success": True, "message": f"Successfully added {qty} item(s) to your cart.", "cart": response.json()}
        if response.status_code == 403:
            return {"success": False, "error": "Authentication failed (403 Forbidden). Your login session has expired. Please log out and sign in again."}
        return {"success": False, "error": f"Failed to add to cart. Server returned status {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to Cart API: {str(e)}"}


@mcp.tool()
def set_cart_item_quantity(food_id: str, quantity: int) -> dict:
    """Sets the exact target quantity of a specific food item in the user's cart (e.g. 2). Prevents duplicate additions."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to your Urban Bites account."}

    target_qty = max(0, int(quantity)) if quantity is not None else 0
    clean_id = str(food_id).strip()

    try:
        cart_res = requests.get(f"{SPRING_BOOT_URL}/api/cart/getCart", headers=headers, timeout=10)
        current_qty = 0
        if cart_res.status_code == 200:
            cart_data = cart_res.json()
            items = cart_data.get("items", {}) if isinstance(cart_data, dict) else {}
            for k, v in items.items():
                if str(k).strip() == clean_id:
                    current_qty = int(v)
                    break

        if current_qty == target_qty:
            return {
                "success": True,
                "message": f"Cart already contains exact quantity of {target_qty} for this item.",
                "current_quantity": target_qty
            }

        if current_qty < target_qty:
            needed = target_qty - current_qty
            add_res = requests.post(
                f"{SPRING_BOOT_URL}/api/cart/addToCart",
                json={"foodId": clean_id, "quantity": needed},
                headers=headers,
                timeout=10
            )
            if add_res.status_code in [200, 201]:
                return {"success": True, "message": f"Updated quantity of item to {target_qty}.", "cart": add_res.json()}
            return {"success": False, "error": f"Failed to set quantity. Status {add_res.status_code}"}
        else:
            diff = current_qty - target_qty
            rem_res = requests.post(
                f"{SPRING_BOOT_URL}/api/cart/removeFromCart",
                json={"foodId": clean_id, "quantity": diff},
                headers=headers,
                timeout=10
            )
            if rem_res.status_code in [200, 201]:
                return {"success": True, "message": f"Reduced quantity of item to {target_qty}.", "cart": rem_res.json()}
            return {"success": False, "error": f"Failed to reduce quantity. Status {rem_res.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to update cart item quantity: {str(e)}"}


@mcp.tool()
def remove_item_from_cart(food_id: str, quantity: int = 1) -> dict:
    """Removes a specific food item ID or reduces its quantity from the user's active cart. Default quantity is 1."""
    headers = get_auth_header()
    if not headers:
        return {"success": False, "error": "User is not logged in. Please sign in to modify your cart."}

    qty = max(1, int(quantity)) if quantity else 1
    clean_id = str(food_id).strip()
    payload = {"foodId": clean_id, "quantity": qty}
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


if __name__ == "__main__":
    mcp.run(transport="stdio", show_banner=False)
