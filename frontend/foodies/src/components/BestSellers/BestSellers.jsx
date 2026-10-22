import React, { useContext } from 'react';
import { StoreContext } from '../../context/StoreContext';
import FoodItem from '../FoodItem/FoodItem';

const BestSellers = () => {
  const { foodList } = useContext(StoreContext);

  // Filter for best sellers
  const bestSellers = foodList.filter(food => food.bestSeller && food.available);

  if (bestSellers.length === 0) {
    return null; // Don't render the section if there are no best sellers
  }

  return (
    <div className="best-sellers-section my-3 my-md-4 p-3 p-md-4 rounded-4" style={{ background: '#f8f9fa', border: '1px solid rgba(45, 106, 79, 0.08)' }}>
      <div className="d-flex align-items-center justify-content-between mb-3 mb-md-4">
        <div>
          <span className="badge bg-warning text-dark px-2.5 py-1.5 rounded-pill fw-bold text-uppercase mb-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
            <i className="bi bi-fire me-1"></i>Most Ordered
          </span>
          <h2 className="fw-bold m-0 fs-3 fs-md-2" style={{ color: '#1b4332', fontFamily: "'Outfit', sans-serif" }}>
            Chef's Signature Best Sellers
          </h2>
          <p className="text-muted small m-0 mt-1">Our highly recommended pure vegetarian house specials in Delhi.</p>
        </div>
        <div className="d-none d-md-flex align-items-center gap-1.5 text-success fw-semibold" style={{ fontSize: '0.9rem' }}>
          <span>100% Veg Guarantee</span>
          <span className="d-inline-flex justify-content-center align-items-center" style={{ border: '2px solid #2d6a4f', padding: '1.5px', borderRadius: '3px', width: '14px', height: '14px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#2d6a4f', borderRadius: '50%' }}></span>
          </span>
        </div>
      </div>
      <div className="row">
        {bestSellers.slice(0, 4).map((food) => (
          <FoodItem
            key={food.id}
            id={food.id}
            name={food.name}
            description={food.description}
            price={food.price}
            imageUrl={food.imageUrl}
            available={food.available}
            bestSeller={food.bestSeller}
            rating={food.rating}
          />
        ))}
      </div>
    </div>
  );
};

export default BestSellers;
