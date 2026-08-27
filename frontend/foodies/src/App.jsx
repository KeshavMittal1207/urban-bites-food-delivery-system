import React, { useEffect } from 'react'
import MenuBar from './components/MenuBar/MenuBar.jsx'
import AIAssistantDrawer from './components/AIAssistantDrawer/AIAssistantDrawer.jsx'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home/Home'
import Contact from './pages/Contact/Contact'
import ExploreFood from './pages/ExploreFood/ExploreFood'
import FoodDetails from './pages/FoodDetails/FoodDetails'
import Cart from './pages/Cart/Cart' 
import Checkout from './pages/Checkout/Checkout'
import MyOrders from './pages/MyOrders/MyOrders'
import Login from './components/Login/Login'
import Register from './components/Register/Register'
import ForgotPassword from './pages/ForgotPassword/ForgotPassword'
import ResetPassword from './pages/ResetPassword/ResetPassword'
import { ToastContainer, toast } from 'react-toastify'

const App = () => {
  useEffect(() => {
    const msg = sessionStorage.getItem('logout_message');
    if (msg) {
      toast.error(msg);
      sessionStorage.removeItem('logout_message');
    }
  }, []);

  return (
    <div>
      <MenuBar/>
      <ToastContainer />
      <AIAssistantDrawer />
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/contact" element={<Contact/>} />
        <Route path="/explore" element={<ExploreFood/>} />
        <Route path="/getFood/:id" element={<FoodDetails/>} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/myorders" element={<MyOrders />} />
        <Route path="/register" element={<Register/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </div>
  )
}

export default App;
