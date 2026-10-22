import React from 'react'
import { Link } from 'react-router-dom'

const Header = () => {
  return (
    <div className="px-3 py-3 px-md-5 py-md-4 mb-3 mb-md-4 hero-jumbotron mt-2 rounded-4 shadow-sm border-start border-4 border-success" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="container-fluid p-0 text-start position-relative" style={{ zIndex: 2 }}>
            <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-success text-white px-2.5 py-1.5 rounded-pill text-uppercase fw-bold d-flex align-items-center gap-1.5" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                  <span className="d-inline-flex justify-content-center align-items-center" style={{ border: '1.5px solid white', padding: '1px', borderRadius: '3px', width: '10px', height: '10px' }}>
                    <span style={{ width: '4px', height: '4px', backgroundColor: 'white', borderRadius: '50%' }}></span>
                  </span>
                  100% Pure Veg
                </span>
                <span className="badge text-bg-warning px-2.5 py-1.5 rounded-pill text-uppercase fw-bold" style={{ fontSize: '0.75rem', color: '#111', letterSpacing: '0.5px' }}>Delhi's Best</span>
            </div>
            <h1 className='fw-bold text-white mb-2 fs-2 fs-md-1' style={{ letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                Savor the Finest <span style={{ color: '#c5a880' }}>Pure Vegetarian</span> Delicacies
            </h1>
            <p className='col-md-9 text-white-50 mb-3 small' style={{ lineHeight: 1.5, fontSize: '0.9rem' }}>
                Fresh, heritage culinary recipes delivered piping hot to your doorstep in Delhi.
            </p>
            <Link to="/explore" className='btn btn-primary px-3 py-2 rounded-pill shadow-sm transition-btn' style={{ letterSpacing: '0.3px', fontSize: '0.88rem' }}>
                Explore Menu <i className="bi bi-arrow-right ms-1"></i>
            </Link>
        </div>
    </div>
  )
}

export default Header;
