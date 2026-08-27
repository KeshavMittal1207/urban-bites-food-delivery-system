import React, { useState, useContext, useEffect } from 'react';
import { StoreContext } from '../../context/StoreContext';
import { verifyOrderPayment } from '../../service/orderService';
import axios from 'axios';
import './AIAssistantDrawer.css';

const AI_AGENT_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';

const AIAssistantDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: '🤖 Hi! I am your Urban Bites AI Assistant. Ask me for food recommendations under your budget, to manage your cart & addresses, or to place an order!',
      agent: 'AI'
    }

  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { token, fetchCartData } = useContext(StoreContext);

  useEffect(() => {
    const loadBackendHistory = async () => {
      try {
        const currentToken = localStorage.getItem('authToken') || token || '';
        const headers = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
        const res = await axios.get(`${AI_AGENT_URL}/api/agent/history`, { headers });
        if (res.data.history && res.data.history.length > 0) {
          const formatted = res.data.history.map(item => ({
            ...item,
            text: typeof item.text === 'string'
              ? item.text
              : (Array.isArray(item.text)
                  ? item.text.map(t => (t && t.text) || JSON.stringify(t)).join('')
                  : (typeof item.text === 'object' && item.text !== null
                      ? (item.text.text || JSON.stringify(item.text))
                      : String(item.text || '')))
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.log("No remote history found, using local state");
      }
    };
    if (isOpen) {
      loadBackendHistory();
    }
  }, [isOpen]);
  // Load Razorpay Checkout SDK script
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleRazorpayPayment = async (paymentData) => {
    if (!window.Razorpay) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ Razorpay SDK not loaded. Please complete payment on the Checkout page for Order #${paymentData.orderId}.`,
          agent: 'OrderAgent'
        }
      ]);
      return;
    }

    const options = {
      key: paymentData.razorpayKeyId,
      amount: Math.round(paymentData.amount * 100),
      currency: 'INR',
      name: 'Urban Bites',
      description: 'AI Order Checkout',
      order_id: paymentData.razorpayOrderId,
      handler: async function (response) {
        try {
          setLoading(true);
          await verifyOrderPayment({
            razorpayOrderId: paymentData.razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });
          setMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: `🎉 Payment Successful! Order #${paymentData.orderId || paymentData.razorpayOrderId} is verified and confirmed. Check My Orders for live status.`,
              agent: 'OrderAgent'
            }
          ]);
          if (fetchCartData && token) {
            fetchCartData();
          }
        } catch (err) {
          setMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: `⚠️ Payment verification failed for Order #${paymentData.orderId}. Please check your orders page.`,
              agent: 'OrderAgent'
            }
          ]);
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        email: paymentData.email || '',
        contact: paymentData.phoneNumber || ''
      },
      theme: { color: '#2d6a4f' },
      modal: {
        ondismiss: function () {
          setMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: `ℹ️ Payment window closed. Order #${paymentData.orderId || paymentData.razorpayOrderId} remains in PENDING status.`,
              agent: 'OrderAgent'
            }
          ]);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentPrompt = input;
    setInput('');
    setLoading(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${AI_AGENT_URL}/api/agent/chat`, {
        prompt: currentPrompt
      }, { headers });

      const aiMsg = {
        sender: 'ai',
        text: response.data.reply,
        agent: response.data.routed_agent
      };
      setMessages(prev => [...prev, aiMsg]);

      // Handle automatic Razorpay payment trigger if card/online payment was chosen
      if (response.data.payment_data) {
        handleRazorpayPayment(response.data.payment_data);
      }

      // Trigger real-time cart update in React if items were added/modified/checked out
      if (fetchCartData && token) {
        fetchCartData();
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: '⚠️ Urban Bites AI Assistant unreachable. Ensure Python microservice is running at port 8000.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant-wrapper">
      <button className="ai-fab-btn shadow-lg" onClick={() => setIsOpen(!isOpen)}>
        <i className="bi bi-robot me-2"></i>
        <span>AI Concierge</span>
      </button>

      {isOpen && (
        <div className="ai-chat-window shadow-lg border-0 rounded-4">
          <div className="ai-chat-header d-flex justify-content-between align-items-center p-3 rounded-top-4">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-chat-left-dots text-warning fs-5"></i>
              <div>
                <h6 className="mb-0 fw-bold text-white">Urban Bites AI Assistant</h6>
              </div>
            </div>
            <button className="btn-close btn-close-white" onClick={() => setIsOpen(false)}></button>
          </div>

          <div className="ai-chat-body p-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble-row ${m.sender}`}>
                <div className={`chat-bubble ${m.sender}`}>
                  {m.agent && m.sender === 'ai' && (
                    <span className="badge bg-dark text-warning border mb-1 d-inline-block small" style={{ fontSize: '0.65rem' }}>
                      ⚡ {m.agent}
                    </span>
                  )}
                  <p className="mb-0 text-break">
                    {typeof m.text === 'string'
                      ? m.text
                      : (typeof m.text === 'object' && m.text !== null
                          ? (m.text.text || JSON.stringify(m.text))
                          : String(m.text || ''))}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-muted small p-2 d-flex align-items-center gap-2">
                <div className="spinner-border spinner-border-sm text-warning" role="status"></div>
                <span>...</span>
              </div>
            )}
          </div>

          <div className="ai-chat-footer p-3 border-top bg-light rounded-bottom-4 d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm rounded-pill px-3"
              placeholder="e.g. Recommend a dinner for 2 under ₹600 and add it to cart..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <button className="btn btn-warning btn-sm rounded-pill px-3 fw-bold shadow-sm" onClick={sendMessage} disabled={loading}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantDrawer;
