import React, { useEffect } from 'react'
import { dummyBookingData } from '../assets/assets'
import Loading from '../components/Loading'

const Mybookings = () => {
  const currency = import.meta.env.VITE_CURRENCY
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const getMyBookings = async() => {
    setBookings(dummyBookingData)
    setIsLoading(false);
  }

  useEffect(()=>{
    getMyBookings()
  },[])
  return !isLoading (
    <div>
      
    </div>
  ) : <Loading/>
}

export default Mybookings