import React, { useState, useContext, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StoreContext } from '../../context/StoreContext';
import { verifyOrderPayment } from '../../service/orderService';
import axios from 'axios';
import './AIAssistantDrawer.css';

const AI_AGENT_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';

const DEFAULT_WELCOME_MESSAGE = {
  sender: 'ai',
  text: '🤖 Hi! I am your Urban Bites AI Assistant. Ask me for food recommendations under your budget, to manage your cart & addresses, or to place an order!',
  agent: 'AI'
};

const getGuestId = () => {
  let gid = sessionStorage.getItem('urban_bites_guest_ai_id');
  if (!gid) {
    gid = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    sessionStorage.setItem('urban_bites_guest_ai_id', gid);
  }
  return gid;
};

const AIAssistantDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [paidOrderIds, setPaidOrderIds] = useState(() => new Set());
  const { token, fetchCartData } = useContext(StoreContext);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  const markOrderAsPaid = (paymentData) => {
    if (!paymentData) return;
    const rId = String(paymentData.razorpayOrderId || '');
    const oId = String(paymentData.orderId || '');

    setPaidOrderIds(prev => {
      const updated = new Set(prev);
      if (rId) updated.add(rId);
      if (oId) updated.add(oId);
      return updated;
    });

    setMessages(prev => prev.map(msg => {
      if (msg.paymentData) {
        const msgRId = String(msg.paymentData.razorpayOrderId || '');
        const msgOId = String(msg.paymentData.orderId || '');
        if ((rId && msgRId === rId) || (oId && msgOId === oId)) {
          return {
            ...msg,
            paymentData: { ...msg.paymentData, paymentStatus: 'PAID' }
          };
        }
      }
      return msg;
    }));
  };

  const loadBackendHistory = async () => {
    try {
      const currentToken = localStorage.getItem('authToken') || token || '';
      const guestId = getGuestId();
      const headers = {
        'x-guest-id': guestId,
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {})
      };
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
      } else {
        // Explicitly reset to default message for a user with zero past messages
        setMessages([DEFAULT_WELCOME_MESSAGE]);
      }
    } catch (err) {
      console.log("No remote history found, defaulting to fresh welcome message");
      setMessages([DEFAULT_WELCOME_MESSAGE]);
    }
  };

  // Reset messages whenever authentication token changes (login, logout, switch account)
  useEffect(() => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    if (isOpen) {
      loadBackendHistory();
    }
  }, [token]);

  // Load history whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      loadBackendHistory();
    }
  }, [isOpen]);

  const handleClearChat = async () => {
    try {
      const currentToken = localStorage.getItem('authToken') || token || '';
      const guestId = getGuestId();
      const headers = {
        'x-guest-id': guestId,
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {})
      };
      await axios.delete(`${AI_AGENT_URL}/api/agent/history`, { headers });
    } catch (e) {
      console.log("Could not clear remote history:", e);
    } finally {
      setMessages([DEFAULT_WELCOME_MESSAGE]);
    }
  };
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
    if (!paymentData || !paymentData.razorpayOrderId) return;
    const orderStatus = (paymentData.orderStatus || '').toUpperCase();
    const paymentStatus = (paymentData.paymentStatus || '').toUpperCase();
    const rId = String(paymentData.razorpayOrderId || '');
    const oId = String(paymentData.orderId || '');

    if (
      orderStatus === 'CANCELED' ||
      orderStatus === 'CANCELLED' ||
      paymentStatus === 'REFUNDED' ||
      paymentStatus === 'PAID' ||
      paidOrderIds.has(rId) ||
      paidOrderIds.has(oId)
    ) {
      return;
    }

    if (!window.Razorpay || (paymentData.razorpayOrderId && paymentData.razorpayOrderId.startsWith('order_mock_'))) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `⚡ Completing payment simulation for Order #${paymentData.orderId}...`,
          agent: 'OrderAgent'
        }
      ]);
      setTimeout(async () => {
        try {
          await verifyOrderPayment({
            razorpayOrderId: paymentData.razorpayOrderId,
            razorpayPaymentId: 'pay_mock_' + Math.random().toString(36).substr(2, 9),
            razorpaySignature: 'sig_mock_12345'
          });
          markOrderAsPaid(paymentData);
          setMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: `🎉 Payment Successful! Order #${paymentData.orderId || paymentData.razorpayOrderId} is verified and confirmed. Check My Orders for live status.`,
              agent: 'OrderAgent'
            }
          ]);
          const activeToken = localStorage.getItem('authToken') || token || '';
          if (fetchCartData && activeToken) {
            fetchCartData();
          }
        } catch (err) {
          setMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: `⚠️ Payment simulation failed for Order #${paymentData.orderId}.`,
              agent: 'OrderAgent'
            }
          ]);
        }
      }, 1000);
      return;
    }

    const options = {
      key: paymentData.razorpayKeyId || 'rzp_test_TEwBlUHYk11TbB',
      amount: Math.round(paymentData.amount * 100),
      currency: 'INR',
      name: 'Urban Bites',
      description: 'Delhi Pure Veg Gourmet Experience',
      order_id: paymentData.razorpayOrderId,
      handler: async function (response) {
        try {
          setLoading(true);
          await verifyOrderPayment({
            razorpayOrderId: paymentData.razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });
          markOrderAsPaid(paymentData);
          setMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: `🎉 Payment Successful! Order #${paymentData.orderId || paymentData.razorpayOrderId} is verified and confirmed. Check My Orders for live status.`,
              agent: 'OrderAgent'
            }
          ]);
          const activeToken = localStorage.getItem('authToken') || token || '';
          if (fetchCartData && activeToken) {
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
              text: `ℹ️ Payment window closed. Order #${paymentData.orderId || paymentData.razorpayOrderId} remains in PENDING status. You can click 'Complete Payment' below anytime.`,
              agent: 'OrderAgent'
            }
          ]);
        }
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error("Razorpay open failed", e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentPrompt = input;
    setInput('');
    setLoading(true);

    try {
      const activeToken = localStorage.getItem('authToken') || token || '';
      const guestId = getGuestId();
      const headers = {
        'x-guest-id': guestId,
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {})
      };
      const response = await axios.post(`${AI_AGENT_URL}/api/agent/chat`, {
        prompt: currentPrompt,
        token: activeToken,
        guest_id: guestId
      }, { headers });

      const aiMsg = {
        sender: 'ai',
        text: response.data.reply,
        agent: response.data.routed_agent,
        paymentData: response.data.payment_data || null
      };
      setMessages(prev => [...prev, aiMsg]);

      // Handle automatic Razorpay payment trigger if card/online payment was chosen
      if (response.data.payment_data) {
        handleRazorpayPayment(response.data.payment_data);
      }

      // Trigger real-time cart update in React if items were added/modified/checked out
      if (fetchCartData && activeToken) {
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
    <div className={`ai-assistant-wrapper ${isOpen ? 'open' : ''}`}>
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
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm btn-outline-light d-flex align-items-center gap-1 py-1 px-2 border-0 opacity-75 hover-opacity-100"
                title="Clear Conversation History"
                onClick={handleClearChat}
                style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <i className="bi bi-arrow-clockwise"></i> Clear
              </button>
              <button className="btn-close btn-close-white" onClick={() => setIsOpen(false)}></button>
            </div>
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
                  {m.sender === 'ai' ? (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {typeof m.text === 'string'
                          ? m.text
                          : (typeof m.text === 'object' && m.text !== null
                              ? (m.text.text || JSON.stringify(m.text))
                              : String(m.text || ''))}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="mb-0 text-break">
                      {typeof m.text === 'string'
                        ? m.text
                        : (typeof m.text === 'object' && m.text !== null
                            ? (m.text.text || JSON.stringify(m.text))
                            : String(m.text || ''))}
                    </p>
                  )}
                  {m.paymentData && (
                    ((m.paymentData.paymentStatus || '').toUpperCase() === 'PAID' ||
                     paidOrderIds.has(String(m.paymentData.razorpayOrderId)) ||
                     paidOrderIds.has(String(m.paymentData.orderId))) ? (
                      <div className="mt-2 d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill bg-success-subtle text-success small border border-success-subtle fw-semibold" style={{ fontSize: '0.8rem' }}>
                        <i className="bi bi-check-circle-fill"></i> Payment Completed
                      </div>
                    ) : (
                      <button
                        className="btn btn-warning btn-sm mt-2 d-inline-flex align-items-center gap-2 fw-bold shadow-sm"
                        onClick={() => handleRazorpayPayment(m.paymentData)}
                      >
                        <i className="bi bi-credit-card-2-front"></i> Complete Payment (₹{m.paymentData.amount})
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-muted small p-2 d-flex align-items-center gap-2">
                <div className="spinner-border spinner-border-sm text-warning" role="status"></div>
                <span>...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
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
