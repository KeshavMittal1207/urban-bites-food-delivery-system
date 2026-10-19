import { createContext, useEffect, useState } from "react";
import { fetchFoodList } from "../service/foodService";
import { addToCart, removeFromCart, fetchCartList } from "../service/CartService";

export const StoreContext = createContext(null);

export const StoreContextProvider = (props) => {
  const [foodList, setFoodList] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [token , setToken] = useState(localStorage.getItem("authToken") || "");

  const increaseQuantity = async (foodId) => {
    setQuantities((prev) => ({
      ...prev,
      [foodId]: (prev[foodId] || 0) + 1,
    }));
    try {
      await addToCart(foodId);
    } catch (err) {
      console.error("Add to cart failed", err);
    }
  };

  const decreaseQuantity = async (foodId) => {
    setQuantities((prev) => ({
      ...prev,
      [foodId]: Math.max((prev[foodId] || 0) - 1, 0),
    }));
    try {
      await removeFromCart(foodId);
    } catch (err) {
      console.error("Remove from cart failed", err);
    }
  };

  useEffect(() => {
    async function loadFoods() {
      try {
        const foods = await fetchFoodList();
        setFoodList(foods);
      } catch (err) {
        console.error("Failed to load foods", err);
      }
    }
    loadFoods();
  }, []);

  const fetchCartData = async () => {
    const activeToken = localStorage.getItem("authToken") || token;
    if (!activeToken) {
      setQuantities({});
      return;
    }
    try {
      const cartRes = await fetchCartList();
      if (cartRes && cartRes.items) {
        setQuantities(cartRes.items);
      } else {
        setQuantities({});
      }
    } catch (err) {
      console.error("Failed to load cart", err);
    }
  };

  useEffect(() => {
    fetchCartData();
  }, [token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("authToken", token);
    }
  }, [token]);

  const getCartTotal = () => {
    let total = 0;
    for (const foodId in quantities) {
      if (quantities[foodId] > 0) {
        const itemInfo = foodList.find((product) => product.id === foodId);
        if (itemInfo) {
          total += itemInfo.price * quantities[foodId];
        }
      }
    }
    return total;
  };

  const contextValue = {
    foodList,
    quantities,
    setQuantities,
    increaseQuantity,
    decreaseQuantity,
    getCartTotal,
    token,
    setToken,
    fetchCartData,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

