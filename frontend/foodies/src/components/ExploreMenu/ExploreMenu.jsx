import React , {useRef} from 'react'
import {categories} from '../../assets/assets.js'
import './ExploreMenu.css'
const ExploreMenu = ({category , setCategory}) => {
  const menuRef = useRef(null);
  const scrollLeft = () => {
    if(menuRef.current){
      menuRef.current.scrollBy({left: -200,behavior:'smooth'});
    }
  };
   const scrollRight = () => {
    if(menuRef.current){
      menuRef.current.scrollBy({left: 200,behavior:'smooth'});
    }
  };
  return (
    <div className="explore-menu position-relative my-3 my-md-4">
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h2 className="fw-bold fs-3 fs-md-2 m-0" style={{ color: '#1b4332', fontFamily: "'Outfit', sans-serif" }}>
          Explore Our Menu
        </h2>
        <div className="d-none d-md-flex">
          <i className='bi bi-arrow-left-circle scroll-icon' onClick={scrollLeft}></i>
          <i className='bi bi-arrow-right-circle scroll-icon' onClick={scrollRight}></i>
        </div>
      </div>
      <p className="text-muted small mb-3">Explore curated pure vegetarian dishes across our signature categories</p>
      <div className="d-flex gap-3 gap-md-4 overflow-auto explore-menu-list py-2" ref={menuRef}>
        {
          categories.map((item,index) => {
            return(
              <div key={index} className="text-center explore-menu-list-item flex-shrink-0" onClick={() =>
                setCategory(prev => prev === item.category ? 'All' : item.category)
              }>
                <img src={item.icon} alt={item.category} className={item.category === category ? 'rounded-circle active category-circle-img':'rounded-circle category-circle-img'} />
                <p className='mt-2 fw-semibold category-label mb-0'>{item.category}</p>
              </div>  
            )
          })
        }
      </div>
      <hr className="my-3 my-md-4" />
    </div>
  )
};

export default ExploreMenu
