import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import { placeOrder, verifyOrderPayment } from '../../service/orderService';
import { fetchSavedAddresses, saveUserAddress } from '../../service/authService';
import { toast } from 'react-toastify';

const Checkout = () => {
  const { quantities, foodList, getCartTotal, setQuantities, token } = useContext(StoreContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    address: '',
    phoneNumber: '',
    email: localStorage.getItem('authEmail') || '',
    paymentMethod: 'CASH'
  });

  const [savedAddresses, setSavedAddresses] = useState({});
  const [saveAddressChecked, setSaveAddressChecked] = useState(false);
  const [saveAddressType, setSaveAddressType] = useState('Home');
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay Checkout Script
  useEffect(() => {
    const loadRazorpay = () => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => console.error('Failed to load Razorpay Checkout SDK');
      document.body.appendChild(script);
    };
    loadRazorpay();
  }, []);

  // Fetch saved addresses from backend
  useEffect(() => {
    if (!token) {
      toast.warning('Please log in to checkout');
      navigate('/login');
      return;
    }
    const loadAddresses = async () => {
      try {
        const addresses = await fetchSavedAddresses();
        if (addresses) {
          setSavedAddresses(addresses);
        }
      } catch (err) {
        console.error('Error fetching addresses:', err);
      }
    };
    loadAddresses();
  }, [token, navigate]);

  // Billing calculation
  const subtotal = getCartTotal();
  const packingCharges = subtotal > 0 ? 15 : 0;
  const deliveryFee = (subtotal > 500 || subtotal === 0) ? 0 : 35;
  const tax = parseFloat((subtotal * 0.05).toFixed(2));
  const discount = subtotal > 400 ? parseFloat((subtotal * 0.10).toFixed(2)) : 0;
  const grandTotal = parseFloat((subtotal + packingCharges + deliveryFee + tax - discount).toFixed(2));

  const cartItems = foodList.filter(food => quantities[food.id] > 0);

  const onChangeHandler = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectSavedAddress = (type) => {
    if (savedAddresses[type]) {
      setFormData(prev => ({ ...prev, address: savedAddresses[type] }));
      toast.success(`${type} address selected!`);
    } else {
      toast.info(`No saved address found for '${type}'. Enter it manually below.`);
    }
  };

  const handleRazorpayPayment = async (orderRes) => {
    if (!window.Razorpay) {
      // In case Razorpay fails to load (e.g. offline dev), support quick simulation
      toast.info('Razorpay SDK not loaded. Simulating successful checkout for testing.');
      setTimeout(async () => {
        try {
          await verifyOrderPayment({
            razorpayOrderId: orderRes.razorpayOrderId,
            razorpayPaymentId: 'pay_mock_' + Math.random().toString(36).substr(2, 9),
            razorpaySignature: 'sig_mock_12345'
          });
          toast.success('Simulation payment successful!');
          setQuantities({});
          navigate('/myorders');
        } catch (err) {
          toast.error('Simulation payment verification failed.');
        }
      }, 1500);
      return;
    }

    const options = {
      key: orderRes.razorpayKeyId,
      amount: Math.round(grandTotal * 100), 
      currency: 'INR',
      name: 'Urban Bites',
      description: 'Delhi Pure Veg Gourmet Experience',
      order_id: orderRes.razorpayOrderId,
      handler: async function (response) {
        try {
          setLoading(true);
          await verifyOrderPayment({
            razorpayOrderId: orderRes.razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });
          toast.success('Payment Verification Successful! Order Confirmed.');
          setQuantities({});
          navigate('/myorders');
        } catch (error) {
          toast.error('Payment verification failed. Please contact support.');
        } finally { 
          setLoading(false);
        }
      },
      prefill: {
        email: formData.email,
        contact: formData.phoneNumber,
      },
      theme: {
        color: '#2d6a4f',
      },
      modal: {
        ondismiss: function () {
          toast.warning('Payment popup closed. Order placed with PENDING payment.');
          navigate('/myorders');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      // 1. If "save address" checkbox is checked, call backend to save address
      if (saveAddressChecked) {
        await saveUserAddress(saveAddressType, formData.address);
      }

      // 2. Place order on backend
      const response = await placeOrder({
        address: formData.address,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        paymentMethod: formData.paymentMethod
      });

      if (response && response.id) {
        if (formData.paymentMethod === 'CARD') {
          // Trigger Razorpay workflow
          await handleRazorpayPayment(response);
        } else {
          toast.success('Order placed successfully (Cash on Delivery)!');
          setQuantities({}); // Clear local cart
          navigate('/myorders');
        }
      } else {
        toast.error('Failed to place order. Try again.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Error occurred while placing order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-3 py-md-5">
      <h1 className="mb-3 mb-md-5 fw-bold text-dark fs-2 fs-md-1" style={{ fontFamily: "'Outfit', sans-serif" }}>Secure Checkout</h1>
      <div className="row g-4 g-md-5">
        {/* Delivery Address & Payment Form */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-3 p-sm-4 p-md-5">
              
              {/* Quick Select Saved Address */}
              <div className="mb-4">
                <label className="form-label text-muted small fw-bold mb-2">Select Saved Address</label>
                <div className="d-flex flex-wrap gap-2">
                  {['Home', 'Office', 'Other'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 py-2 fw-semibold ${savedAddresses[type] ? 'btn-outline-success border-success' : 'btn-outline-secondary text-muted'}`}
                      onClick={() => handleSelectSavedAddress(type)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      <i className={`bi bi-${type === 'Home' ? 'house' : type === 'Office' ? 'briefcase' : 'geo-alt'} me-1.5`}></i>
                      {type} {savedAddresses[type] ? '✓' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <h4 className="fw-bold mb-4 text-dark" style={{ color: '#1b4332' }}>
                <i className="bi bi-geo-alt me-2 text-success"></i>Delivery Information
              </h4>
              
              <form onSubmit={onSubmitHandler}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label small fw-semibold text-muted">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control py-2.5 rounded-3" 
                    id="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={onChangeHandler} 
                    required 
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="phoneNumber" className="form-label small fw-semibold text-muted">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-control py-2.5 rounded-3" 
                    id="phoneNumber" 
                    name="phoneNumber" 
                    placeholder="Enter phone number" 
                    value={formData.phoneNumber} 
                    onChange={onChangeHandler} 
                    required 
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="address" className="form-label small fw-semibold text-muted">Complete Delivery Address</label>
                  <textarea 
                    className="form-control py-2.5 rounded-3" 
                    id="address" 
                    name="address" 
                    rows="3" 
                    placeholder="Street name, flat, block, area, city, pincode" 
                    value={formData.address} 
                    onChange={onChangeHandler} 
                    required 
                  ></textarea>
                </div>

                {/* Save Address Checkbox */}
                <div className="mb-4 p-3 bg-light rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="saveAddressCheck" 
                      checked={saveAddressChecked}
                      onChange={(e) => setSaveAddressChecked(e.target.checked)}
                    />
                    <label className="form-check-label text-muted small fw-semibold" htmlFor="saveAddressCheck">
                      Save this address for future orders
                    </label>
                  </div>
                  {saveAddressChecked && (
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-muted">Save as:</span>
                      <select 
                        className="form-select form-select-sm rounded-pill px-3"
                        value={saveAddressType}
                        onChange={(e) => setSaveAddressType(e.target.value)}
                      >
                        <option value="Home">Home</option>
                        <option value="Office">Office</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Payment Method Selection */}
                <h4 className="fw-bold mb-3 mt-4 text-dark" style={{ color: '#1b4332' }}>
                  <i className="bi bi-credit-card me-2 text-success"></i>Payment Method
                </h4>
                
                <div className="row g-3 mb-5">
                  <div className="col-md-6">
                    <div 
                      className={`card p-3 rounded-4 border-2 cursor-pointer text-center ${formData.paymentMethod === 'CASH' ? 'border-success bg-success-subtle bg-opacity-10' : 'border-light bg-light'}`}
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'CASH' }))}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="bi bi-cash-coin text-success mb-2" style={{ fontSize: '1.5rem' }}></i>
                      <h6 className="fw-bold mb-1">Cash on Delivery</h6>
                      <small className="text-muted">Pay with cash at your door</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div 
                      className={`card p-3 rounded-4 border-2 cursor-pointer text-center ${formData.paymentMethod === 'CARD' ? 'border-success bg-success-subtle bg-opacity-10' : 'border-light bg-light'}`}
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'CARD' }))}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="bi bi-credit-card-2-front text-success mb-2" style={{ fontSize: '1.5rem' }}></i>
                      <h6 className="fw-bold mb-1">Card / Razorpay</h6>
                      <small className="text-muted">Debit/Credit/UPI Online</small>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-success w-100 py-3 rounded-pill fw-bold text-uppercase shadow-sm"
                  style={{ background: '#2d6a4f', border: 'none' }}
                  disabled={loading}
                >
                  {loading ? 'Processing Order...' : formData.paymentMethod === 'CARD' ? 'Pay & Place Order' : 'Confirm Cash Order'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Order Summary & Items Preview */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 bg-light mb-4">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-4 text-dark"><i className="bi bi-receipt me-2 text-success"></i>Order Summary</h4>
              <div className="mb-4 border-bottom pb-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {cartItems.map(food => (
                  <div key={food.id} className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <img src={food.imageUrl} alt={food.name} className="rounded-3 shadow-sm border" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                      <div>
                        <h6 className="mb-0 fw-bold small">{food.name}</h6>
                        <small className="text-muted">Qty: {quantities[food.id]} x &#8377;{food.price}</small>
                      </div>
                    </div>
                    <span className="fw-semibold text-dark small">&#8377;{food.price * quantities[food.id]}</span>
                  </div>
                ))}
              </div>

              {/* Bill breakdown */}
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Subtotal</span>
                <span className="fw-semibold small">&#8377;{subtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Packing Charges</span>
                <span className="fw-semibold small">&#8377;{packingCharges.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Delivery Charges</span>
                <span className="fw-semibold small">
                  {deliveryFee === 0 ? <span className="text-success fw-bold text-uppercase">Free</span> : `\u20B9${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">GST (5%)</span>
                <span className="fw-semibold small">&#8377;{tax.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span className="small">Discount (10% Off)</span>
                  <span className="fw-bold small">-&#8377;{discount.toFixed(2)}</span>
                </div>
              )}
              <hr className="my-3" />
              <div className="d-flex justify-content-between mb-2">
                <span className="h5 fw-bold text-dark">Grand Total</span>
                <span className="h4 fw-bold text-success">&#8377;{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
