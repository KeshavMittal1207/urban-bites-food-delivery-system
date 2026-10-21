import React, { useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../../assets/assets.js'
import { StoreContext } from '../../context/StoreContext'

const MenuBar = () => {
  const navigate = useNavigate();
  const { token, setToken, quantities } = useContext(StoreContext);

  const totalCartItems = Object.values(quantities).reduce((acc, qty) => acc + qty, 0);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authEmail');
    sessionStorage.removeItem('urban_bites_guest_ai_id');
    setToken('');
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light">
      <div className="container">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none ms-3">
          <span className="d-inline-flex justify-content-center align-items-center" style={{ border: '2px solid #2d6a4f', padding: '3px', borderRadius: '4px', width: '24px', height: '24px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#2d6a4f', borderRadius: '50%' }}></span>
          </span>
          <span className="fw-bold fs-3" style={{ color: '#1b4332', fontFamily: "'Outfit', sans-serif" }}>Urban<span style={{ color: '#c5a880' }}>Bites</span></span>
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/explore">Explore</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/contact">Contact Us</Link>
            </li>
            {token && (
              <li className="nav-item">
                <Link className="nav-link" to="/myorders">My Orders</Link>
              </li>
            )}
          </ul>
          <div className="d-flex align-items-center gap-4">
            <Link to="/cart">
              <div className="position-relative">
                <img src={assets.cart} alt="Cart" height={32} width={32} />
                {totalCartItems > 0 && (
                  <span className='position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark'>
                    {totalCartItems}
                  </span>
                )}
              </div>
            </Link>
            {token ? (
              <button className='btn btn-outline-danger' onClick={handleLogout}>Logout</button>
            ) : (
              <>
                <button className='btn btn-outline-primary' onClick={() => navigate('/login')}>Login</button>
                <button className='btn btn-outline-success' onClick={() => navigate('/register')}>Register</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default MenuBar;
