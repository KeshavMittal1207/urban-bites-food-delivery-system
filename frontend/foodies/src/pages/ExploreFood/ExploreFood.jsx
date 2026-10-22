import React,{useState} from 'react'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'

const ExploreFood = () => {
  const [category,setCategory] = useState('All');
  const [searchText , setSearchText] = useState('');
  const [avgRating, setAvgRating] = useState(0.0);

  const loadReviewData = async () => {
    try {
        const avg = await fetchAverageRating(id);
        setAvgRating(avg);
    } catch (error) {
        console.error('Error fetching reviews:', error);
    }
  };
  

  return (
    <>
    <div className="container py-3">
      <div className='row justify-content-center'>
        <div className='col-12 col-md-8 col-lg-7'>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className='d-flex flex-column flex-sm-row gap-2 mb-3'>
              <select 
                className='form-select rounded-pill px-3 py-2 border-success-subtle shadow-sm flex-shrink-0' 
                style={{ minWidth: '160px' }} 
                onChange={(e) => setCategory(e.target.value)} 
                value={category}
              >
                <option value="All">All Categories</option>
                <option value="Veg Biryani">Veg Biryani</option>
                <option value="Desserts & Ice cream">Desserts & Ice cream</option>
                <option value="Veg Burgers">Veg Burgers</option>
                <option value="Eggless Cakes">Eggless Cakes</option>
                <option value="Pure Veg Pizza">Pure Veg Pizza</option>
                <option value="Veg Rolls">Veg Rolls</option>
                <option value="Fresh Salads">Fresh Salads</option>
              </select>
              <div className="input-group shadow-sm rounded-pill overflow-hidden flex-grow-1 border">
                <input 
                  type="text" 
                  className='form-control border-0 px-3 py-2' 
                  placeholder='Search your favourite dish...' 
                  onChange={(e) => setSearchText(e.target.value)} 
                  value={searchText}
                  style={{ fontSize: '16px' }}
                />
                <button className='btn btn-success px-3' type='submit'> 
                  <i className='bi bi-search'></i>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    <FoodDisplay category={category} searchText={searchText}/>
    </>
  )
}
export default ExploreFood
