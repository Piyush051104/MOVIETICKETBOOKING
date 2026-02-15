import React from 'react'
import Navbar from './components/Navbar'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Movies from './pages/Movies'
import MovieDetails from './pages/MovieDetails'
import SeatLayout from './pages/SeatLayout'
import Mybookings from './pages/Mybookings'
import Favourite from './pages/Favourite'

const App = () => {
  return (
    <>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Home/>} />
        <Route path='/movies' element={<Movies/>} />
        <Route path='/movies/:id' element={<MovieDetails/>} />
        <Route path='/movies/:id/date' element={<SeatLayout/>} />
        <Route path='/my-bookings' element={<Mybookings/>} />
        <Route path='/favourites' element={<Favourite/>} />
      </Routes>
    </>
    
  )
}

export default App