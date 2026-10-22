import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import './Cart.css';

const Cart = () => {
  const { foodList, quantities, increaseQuantity, decreaseQuantity, getCartTotal } = useContext(StoreContext);
  const navigate = useNavigate();

  const cartItems = foodList.filter(food => quantities[food.id] > 0);
  const subtotal = getCartTotal();
  const packingCharges = subtotal > 0 ? 15 : 0;
  const deliveryFee = (subtotal > 500 || subtotal === 0) ? 0 : 35;
  const tax = parseFloat((subtotal * 0.05).toFixed(2));
  const discount = subtotal > 400 ? parseFloat((subtotal * 0.10).toFixed(2)) : 0;
  const grandTotal = parseFloat((subtotal + packingCharges + deliveryFee + tax - discount).toFixed(2));

  return (
    <div className="container py-3 py-md-5">
      <h1 className="mb-3 mb-md-5 fw-bold text-dark fs-2 fs-md-1">Your Shopping Cart</h1>
      {cartItems.length === 0 ? (
        <div className="text-center py-5 shadow-sm rounded-4 bg-light">
          <i className="bi bi-cart-x display-1 text-muted mb-4"></i>
          <h3 className="text-secondary">Your cart is empty</h3>
          <p className="text-muted">Looks like you haven't added anything to your cart yet.</p>
          <Link to="/" className="btn btn-primary btn-lg mt-3 px-5 rounded-pill">
            Explore Food Menu
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {/* Cart Items List */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-3 p-md-4">
                {cartItems.map((food) => {
                  const quantity = quantities[food.id];
                  return (
                    <div key={food.id} className="row align-items-center mb-4 pb-4 border-bottom">
                      <div className="col-3 col-md-2">
                        <img 
                          src={food.imageUrl} 
                          alt={food.name} 
                          className="img-fluid rounded-3 shadow-sm" 
                          style={{ objectFit: 'cover', height: '80px', width: '80px' }}
                        />
                      </div>
                      <div className="col-9 col-md-4">
                        <span className="badge text-bg-warning mb-1" style={{ fontSize: '0.75rem' }}>{food.category}</span>
                        <h5 className="mb-1 text-dark fw-bold">{food.name}</h5>
                        <p className="text-muted mb-0 text-truncate" style={{ fontSize: '0.875rem' }}>{food.description}</p>
                      </div>
                      <div className="col-4 col-md-2 text-md-center mt-3 mt-md-0">
                        <p className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>Price</p>
                        <p className="fw-semibold mb-0">&#8377;{food.price}</p>
                      </div>
                      <div className="col-4 col-md-2 mt-3 mt-md-0">
                        <p className="text-muted mb-1 text-center" style={{ fontSize: '0.8rem' }}>Quantity</p>
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={() => decreaseQuantity(food.id)}>
                            <i className="bi bi-dash"></i>
                          </button>
                          <span className="fw-bold px-2">{quantity}</span>
                          <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={() => increaseQuantity(food.id)}>
                            <i className="bi bi-plus"></i>
                          </button>
                        </div>
                      </div>
                      <div className="col-4 col-md-2 text-end mt-3 mt-md-0">
                        <p className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>Total</p>
                        <p className="fw-bold text-success mb-0">&#8377;{food.price * quantity}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="text-start mt-2">
                  <Link to="/" className="btn btn-outline-primary rounded-pill">
                    <i className="bi bi-arrow-left me-2"></i>Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Summary */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 bg-light">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4 text-dark">Order Summary</h4>
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
                    {deliveryFee === 0 ? <span className="text-success fw-bold">FREE</span> : `\u20B9${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">GST (5%)</span>
                  <span className="fw-semibold small">&#8377;{tax.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="d-flex justify-content-between mb-2 text-success">
                    <span className="small">Discount (10% Off)</span>
                    <span className="fw-bold small">{discount.toFixed(2)}</span>
                  </div>
                )}
                <hr className="my-3" />
                <div className="d-flex justify-content-between mb-4">
                  <span className="h5 fw-bold text-dark mb-0">Grand Total</span>
                  <span className="h4 fw-bold text-success mb-0">&#8377;{grandTotal.toFixed(2)}</span>
                </div>
                <button 
                  className="btn btn-success w-100 py-3 rounded-pill fw-bold text-uppercase shadow-sm"
                  onClick={() => navigate('/checkout')}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
