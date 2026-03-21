import React, { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import { useAppContext } from '../context/AppContext'
import { useSearchParams } from 'react-router-dom'
import { SearchIcon, XIcon } from 'lucide-react'

const Movies = () => {

  const { shows } = useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')

  // Update search when URL param changes
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '')
  }, [searchParams])

  const handleSearch = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    if (value.trim()) {
      setSearchParams({ search: value.trim() })
    } else {
      setSearchParams({})
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchParams({})
  }

  // Filter movies based on search query
  const filteredShows = searchQuery.trim()
    ? shows.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.genres?.some(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        movie.original_language?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : shows

  return shows.length > 0 ? (
    <div className='relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]'>

      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />

      {/* Search Bar */}
      <div className='relative w-full max-w-md mb-8'>
        <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
        <input
          type='text'
          value={searchQuery}
          onChange={handleSearch}
          placeholder='Search by movie name, genre, language...'
          className='w-full pl-10 pr-10 py-2.5 rounded-full bg-white/10 border border-white/15 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-primary transition'
        />
        {searchQuery && (
          <XIcon
            className='absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-white transition'
            onClick={clearSearch}
          />
        )}
      </div>

      {/* Results count */}
      <h1 className='text-lg font-medium my-4'>
        {searchQuery
          ? `${filteredShows.length} result${filteredShows.length !== 1 ? 's' : ''} for "${searchQuery}"`
          : 'Now Showing'
        }
      </h1>

      {/* Movies Grid */}
      {filteredShows.length > 0 ? (
        <div className='flex flex-wrap max-sm:justify-center gap-8'>
          {filteredShows.map((movie) => (
            <MovieCard movie={movie} key={movie._id} />
          ))}
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center py-32'>
          <SearchIcon className='w-16 h-16 text-gray-600 mb-4' />
          <h2 className='text-xl font-medium text-gray-400'>No movies found for "{searchQuery}"</h2>
          <p className='text-gray-500 text-sm mt-2'>Try searching with a different keyword</p>
          <button
            onClick={clearSearch}
            className='mt-6 px-6 py-2 bg-primary hover:bg-primary-dull transition rounded-full text-sm font-medium'
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className='flex flex-col items-center justify-center h-screen'>
      <h1 className='text-3xl font-bold text-center'>No movies available</h1>
    </div>
  )
}

export default Movies