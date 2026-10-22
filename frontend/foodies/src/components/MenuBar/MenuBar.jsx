import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../../assets/assets.js'
import { StoreContext } from '../../context/StoreContext'

const MenuBar = () => {
  const navigate = useNavigate();
  const { token, setToken, quantities } = useContext(StoreContext);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);

  const totalCartItems = Object.values(quantities).reduce((acc, qty) => acc + qty, 0);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authEmail');
    sessionStorage.removeItem('urban_bites_guest_ai_id');
    setToken('');
    setIsNavCollapsed(true);
    navigate('/login');
  };

  const closeNav = () => {
    setIsNavCollapsed(true);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light py-2 shadow-sm bg-white sticky-top">
      <div className="container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none" onClick={closeNav}>
          <span className="d-inline-flex justify-content-center align-items-center" style={{ border: '2px solid #2d6a4f', padding: '2px', borderRadius: '4px', width: '22px', height: '22px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#2d6a4f', borderRadius: '50%' }}></span>
          </span>
          <span className="fw-bold fs-4" style={{ color: '#1b4332', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px' }}>
            Urban<span style={{ color: '#c5a880' }}>Bites</span>
          </span>
        </Link>

        {/* Mobile Action Bar: Always-Visible Cart Icon + Hamburger */}
        <div className="d-flex align-items-center gap-3 d-lg-none">
          <Link to="/cart" className="position-relative text-decoration-none p-1" onClick={closeNav}>
            <img src={assets.cart} alt="Cart" height={26} width={26} />
            {totalCartItems > 0 && (
              <span className='position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark fw-bold' style={{ fontSize: '0.65rem' }}>
                {totalCartItems}
              </span>
            )}
          </Link>
          <button 
            className="navbar-toggler border-0 p-1" 
            type="button" 
            aria-label="Toggle navigation"
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
          >
            <span className="navbar-toggler-icon" style={{ width: '1.25em', height: '1.25em' }}></span>
          </button>
        </div>

        {/* Collapsible Menu Links */}
        <div className={`collapse navbar-collapse ${!isNavCollapsed ? 'show' : ''}`} id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 mt-2 mt-lg-0">
            <li className="nav-item">
              <Link className="nav-link fw-semibold" to="/" onClick={closeNav}>Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link fw-semibold" to="/explore" onClick={closeNav}>Explore</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link fw-semibold" to="/contact" onClick={closeNav}>Contact Us</Link>
            </li>
            {token && (
              <li className="nav-item">
                <Link className="nav-link fw-semibold" to="/myorders" onClick={closeNav}>My Orders</Link>
              </li>
            )}
          </ul>

          {/* Desktop Right Actions */}
          <div className="d-flex align-items-center gap-3 mt-2 mt-lg-0 pb-2 pb-lg-0 border-top border-top-lg-0 pt-2 pt-lg-0">
            <Link to="/cart" className="d-none d-lg-block position-relative text-decoration-none" onClick={closeNav}>
              <img src={assets.cart} alt="Cart" height={30} width={30} />
              {totalCartItems > 0 && (
                <span className='position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark fw-bold'>
                  {totalCartItems}
                </span>
              )}
            </Link>
            {token ? (
              <button className='btn btn-outline-danger btn-sm px-3 rounded-pill' onClick={handleLogout}>Logout</button>
            ) : (
              <div className="d-flex gap-2 w-100 w-lg-auto">
                <button className='btn btn-outline-primary btn-sm px-3 rounded-pill flex-fill flex-lg-grow-0' onClick={() => { closeNav(); navigate('/login'); }}>Login</button>
                <button className='btn btn-success btn-sm px-3 rounded-pill flex-fill flex-lg-grow-0' onClick={() => { closeNav(); navigate('/register'); }}>Register</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default MenuBar;
