import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { StoreContext } from "../../context/StoreContext"; 
const FoodItem = ({ name, description, id, imageUrl, price, available = true, bestSeller = false, rating }) => {
  const { increaseQuantity, decreaseQuantity, quantities } = useContext(StoreContext);
  

  return (
    <div className="col-6 col-sm-6 col-md-4 col-lg-3 px-1.5 px-sm-2 px-md-3 mb-3 mb-md-4 d-flex justify-content-center">
      <div className="card h-100 shadow-sm border-0 rounded-4 w-100 food-item-card" style={{ textDecoration: "none", overflow: 'hidden' }}>
        <div className="position-relative">
          <Link to={available ? `/getFood/${id}` : '#'}>
            <img
              src={imageUrl}
              className="card-img-top food-card-image"
              alt={name}
              style={{ objectFit: 'cover', width: '100%', filter: available ? 'none' : 'grayscale(60%) opacity(50%)' }}
            />
          </Link>
          {bestSeller && (
            <span className="position-absolute top-0 start-0 m-2 badge bg-warning text-dark fw-bold shadow-sm" style={{ zIndex: 1, fontSize: '0.68rem' }}>
              <i className="bi bi-star-fill me-1"></i>Best Seller
            </span>
          )}
          {!available && (
            <span className="position-absolute top-50 start-50 translate-middle badge bg-danger px-2.5 py-1.5 rounded-3 fw-bold text-uppercase shadow-lg" style={{ zIndex: 1, fontSize: '0.72rem' }}>
              Sold Out
            </span>
          )}
        </div>
        <div className="card-body d-flex flex-column justify-content-between p-2.5 p-sm-3">
          <div>
            <h5 className="card-title fw-bold mb-1 mb-sm-2 text-dark fs-6 fs-sm-5 text-truncate" title={name}>
              <Link to={available ? `/getFood/${id}` : '#'} className="text-decoration-none text-dark">
                {name}
              </Link>
            </h5>
            <p className="card-text text-muted small mb-2 d-none d-sm-block" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.8rem' }}>
              {description}
            </p>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-auto pt-1">
            <span className="fw-bold text-success fs-6 fs-sm-5">&#8377;{price}</span>
            <div className="small text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-star-fill text-warning"></i>
              <span>{rating !== undefined && rating !== null ? rating.toFixed(1) : '4.5'}</span>
            </div>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center bg-light border-0 py-2 px-2 px-sm-3">
          <Link className={`d-none d-sm-inline-block btn ${available ? 'btn-outline-success' : 'btn-outline-secondary disabled'} btn-sm px-2 px-md-3 rounded-pill`} to={`/getFood/${id}`} style={{ fontSize: '0.78rem' }}>
            View
          </Link>
          <div className="ms-auto w-100 w-sm-auto text-end">
            {!available ? (
              <button className="btn btn-secondary btn-sm rounded-pill px-2.5 w-100 w-sm-auto" style={{ fontSize: '0.75rem' }} disabled>Sold Out</button>
            ) : quantities[id] > 0 ? (
              <div className="d-flex align-items-center justify-content-center justify-content-sm-end gap-1.5">
                <button className="btn btn-outline-danger btn-sm rounded-circle p-0" style={{ width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => decreaseQuantity(id)}>
                  <i className="bi bi-dash"></i>
                </button>
                <span className="fw-bold px-1" style={{ fontSize: '0.85rem' }}>{quantities[id]}</span>
                <button className="btn btn-outline-success btn-sm rounded-circle p-0" style={{ width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => increaseQuantity(id)}>
                  <i className="bi bi-plus"></i>
                </button>
              </div>
            ) : (
              <button className="btn btn-success btn-sm rounded-pill px-2.5 px-md-3 w-100 w-sm-auto fw-bold" style={{ fontSize: '0.78rem' }} onClick={() => increaseQuantity(id)}>
                <i className="bi bi-cart-plus me-1"></i>Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodItem;
