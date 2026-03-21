import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { MenuIcon, SearchIcon, TicketPlus, XIcon } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { useAppContext } from '../context/AppContext'

const Navbar = () => {

  const [isOpen, setIsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useUser()
  const { openSignIn } = useClerk()
  const navigate = useNavigate()
  const { favoriteMovies, shows } = useAppContext()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  
  const suggestions = searchQuery.trim().length > 0
    ? shows.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : []

  return (
    <div className='fixed top-0 left-0 z-50 w-full flex items-center justify-between px-6 md:px-16 lg:px-36 py-5'>
      <Link to='/' className='max-md:flex-1'>
        <img src={assets.logo} alt="" className='w-36 h-auto' />
      </Link>

      <div className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium max-md:text-lg z-50 flex flex-col md:flex-row items-center max-md:justify-center gap-8 min-md:px-8 py-3 max-md:h-screen min-md:rounded-full backdrop-blur bg-black/70 md:bg-white/10 md:border border-gray-300/20 overflow-hidden transition-[width] duration-300 ${isOpen ? 'max-md:w-full' : 'max-md:w-0'}`}>
        <XIcon className='md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer' onClick={() => setIsOpen(!isOpen)} />
        <Link onClick={() => { scrollTo(0, 0); setIsOpen(false) }} to='/'>Home</Link>
        <Link onClick={() => { scrollTo(0, 0); setIsOpen(false) }} to='/movies'>Movies</Link>
        {/* <Link onClick={() => { scrollTo(0, 0); setIsOpen(false) }} to='/'>Theaters</Link>
        <Link onClick={() => { scrollTo(0, 0); setIsOpen(false) }} to='/'>Releases</Link> */}
        {favoriteMovies.length > 0 && <Link onClick={() => { scrollTo(0, 0); setIsOpen(false) }} to='/favorite'>Favorites</Link>}
      </div>

      <div className='flex items-center gap-3'>

       
        <div className='relative max-md:hidden'>
          {searchOpen ? (
            <form onSubmit={handleSearch} className='flex items-center'>
              <input
                autoFocus
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search movies...'
                className='w-48 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-primary transition'
              />
              <XIcon
                className='w-5 h-5 ml-2 cursor-pointer text-gray-400 hover:text-white transition'
                onClick={() => { setSearchOpen(false); setSearchQuery('') }}
              />

              
              {suggestions.length > 0 && (
                <div className='absolute top-10 left-0 w-56 bg-black/90 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50'>
                  {suggestions.map(movie => (
                    <div
                      key={movie._id}
                      onClick={() => {
                        navigate(`/movies/${movie._id}`)
                        setSearchOpen(false)
                        setSearchQuery('')
                      }}
                      className='px-4 py-2.5 text-sm hover:bg-white/10 cursor-pointer transition flex items-center gap-2'
                    >
                      <SearchIcon className='w-3 h-3 text-gray-400' />
                      {movie.title}
                    </div>
                  ))}
                </div>
              )}
            </form>
          ) : (
            <SearchIcon
              className='w-6 h-6 cursor-pointer hover:text-primary transition'
              onClick={() => setSearchOpen(true)}
            />
          )}
        </div>

        {!user ? (
          <div className='flex items-center gap-2'>
            <button
              onClick={() => openSignIn({ fallbackRedirectUrl: '/' })}
              className='px-4 py-1 sm:px-5 sm:py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer text-sm'
            >
              Login
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem('adminLoginPending', 'true')
                navigate('/admin-redirect')
              }}
              className='px-4 py-1 sm:px-5 sm:py-2 border border-primary text-primary hover:bg-primary hover:text-white transition rounded-full font-medium cursor-pointer text-sm'
            >
              Admin
            </button>
          </div>
        ) : (
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Action label="My Bookings" labelIcon={<TicketPlus width={15} />} onClick={() => navigate('/my-bookings')} />
            </UserButton.MenuItems>
          </UserButton>
        )}
      </div>

      <MenuIcon className='max-md:ml-4 md:hidden w-8 h-8 cursor-pointer' onClick={() => setIsOpen(!isOpen)} />
    </div>
  )
}

export default Navbar