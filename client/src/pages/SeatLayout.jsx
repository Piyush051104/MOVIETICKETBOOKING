import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Loading from '../components/Loading'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'
import isoTimeFormat from '../lib/isoTimeFormat'
import BlurCircle from '../components/BlurCircle'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'
import { assets } from '../assets/assets'

const SeatLayout = () => {

  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]]

  const { id, date } = useParams()
  const [selectedSeats, setSelectedSeats] = useState([])
  const [selectedTime, setSelectedTime] = useState(null)
  const [show, setShow] = useState(null)
  const [occupiedSeats, setOccupiedSeats] = useState([])
  const [selectingSeats, setSelectingSeats] = useState({})

  
  const selectedSeatsRef = useRef([])
  const selectedTimeRef = useRef(null)
  const seatTimersRef = useRef({}) // seatId -> timeoutId, mirrors the server's Redis TTL

  const SEAT_LOCK_MS = 120000 // must match LOCK_TTL_SECONDS in server/socket.js (120s)

  const navigate = useNavigate()
  const { axios, getToken, user, socket } = useAppContext()


  useEffect(() => {
    selectedSeatsRef.current = selectedSeats
  }, [selectedSeats])

  useEffect(() => {
    selectedTimeRef.current = selectedTime
  }, [selectedTime])

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`)
      if (data.success) setShow(data)
    } catch (error) {
      console.log(error)
    }
  }

  const getOccupiedSeats = async () => {
    try {
      const { data } = await axios.get(`/api/booking/seats/${selectedTime.showId}`,
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
    }
  }


  useEffect(() => {
    if (!socket || !selectedTime) return

    socket.emit('join-show', selectedTime.showId)

    socket.on('seat-selected', ({ seatId, socketId }) => {
      setSelectingSeats(prev => ({ ...prev, [seatId]: socketId }))
    })

    socket.on('seat-deselected', ({ seatId }) => {
      setSelectingSeats(prev => {
        const updated = { ...prev }
        delete updated[seatId]
        return updated
      })
    })

    socket.on('current-selecting', (seats) => {
      setSelectingSeats(seats)
    })

    return () => {
      socket.off('seat-selected')
      socket.off('seat-deselected')
      socket.off('current-selecting')
    }
  }, [socket, selectedTime])

  
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket && selectedTimeRef.current && selectedSeatsRef.current.length > 0) {
        socket.emit('leave-show', {
          showId: selectedTimeRef.current.showId,
          selectedSeats: selectedSeatsRef.current
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

  
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      handleBeforeUnload() 
    }
  }, [socket])

  const handleSeatClick = (seatId) => {
    if (!selectedTime) return toast('Please select time first')
    if (occupiedSeats.includes(seatId)) return toast('This seat is already booked')

    if (selectingSeats[seatId] && selectingSeats[seatId] !== socket?.id) {
      return toast('Someone else is selecting this seat')
    }

    const isAlreadySelected = selectedSeats.includes(seatId)

    if (!isAlreadySelected && selectedSeats.length >= 5) {
      return toast('You can only select 5 seats')
    }

    if (isAlreadySelected) {
      setSelectedSeats(prev => prev.filter(seat => seat !== seatId))
      socket?.emit('deselect-seat', { showId: selectedTime.showId, seatId })

      if (seatTimersRef.current[seatId]) {
        clearTimeout(seatTimersRef.current[seatId])
        delete seatTimersRef.current[seatId]
      }
    } else {
      setSelectedSeats(prev => [...prev, seatId])
      socket?.emit('select-seat', { showId: selectedTime.showId, seatId })

      seatTimersRef.current[seatId] = setTimeout(() => {
        setSelectedSeats(prev => prev.filter(seat => seat !== seatId))
        socket?.emit('deselect-seat', { showId: selectedTime.showId, seatId })
        toast('Seat selection timed out, please select again')
        delete seatTimersRef.current[seatId]
      }, SEAT_LOCK_MS)
    }
  }

  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`
          const isSelected = selectedSeats.includes(seatId)
          const isOccupied = occupiedSeats.includes(seatId)
          const isSelecting = selectingSeats[seatId] && selectingSeats[seatId] !== socket?.id && !isSelected

          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              title={isSelecting ? 'Someone is selecting this seat' : seatId}
              className={`h-8 w-8 rounded border text-xs font-medium transition-all duration-200 cursor-pointer
                ${isOccupied
                  ? 'opacity-40 bg-red-500/30 border-red-500/50 cursor-not-allowed'
                  : isSelected
                    ? 'bg-primary border-primary text-white scale-110'
                    : isSelecting
                      ? 'bg-yellow-400/40 border-yellow-400 text-yellow-300 cursor-not-allowed animate-pulse'
                      : 'border-primary/60 hover:bg-primary/20'
                }`}
            >
              {seatId}
            </button>
          )
        })}
      </div>
    </div>
  )

  const bookTickets = async () => {
    try {
      if (!user) return toast.error('Please login to proceed')
      if (!selectedTime || !selectedSeats.length) return toast.error('Please select a time and seats')

      const { data } = await axios.post('/api/booking/create',
        { showId: selectedTime.showId, selectedSeats },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )

      if (data.success) {
        Object.values(seatTimersRef.current).forEach(clearTimeout)
        seatTimersRef.current = {}

        socket?.emit('leave-show', {
          showId: selectedTime.showId,
          selectedSeats
        })
        window.location.href = data.url
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    getShow()
  }, [])

  useEffect(() => {
    return () => {
      Object.values(seatTimersRef.current).forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    if (selectedTime) {
      getOccupiedSeats()
      setSelectedSeats([])
      setSelectingSeats({})
    }
  }, [selectedTime])

  return show ? (
    <div className='flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50'>

      {/* Available Timings */}
      <div className='w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30'>
        <p className='text-lg font-semibold px-6'>Available Timings</p>
        <div className='mt-5 space-y-1'>
          {show.dateTime[date].map((item) => (
            <div
              key={item.time}
              onClick={() => setSelectedTime(item)}
              className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${selectedTime?.time === item.time ? "bg-primary text-white" : "hover:bg-primary/20"}`}
            >
              <ClockIcon className="w-4 h-4" />
              <p className='text-sm'>{isoTimeFormat(item.time)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Seats Layout */}
      <div className='relative flex-1 flex flex-col items-center max-md:mt-16'>
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />
        <h1 className='text-2xl font-semibold mb-4'>Select your seat</h1>
        <img src={assets.screenImage} alt="screen" />
        <p className='text-gray-400 text-sm mb-6'>SCREEN SIDE</p>

        {/* Seat Legend */}
        <div className='flex flex-wrap justify-center items-center gap-4 mb-6 text-xs text-gray-400'>
          <div className='flex items-center gap-1.5'>
            <div className='w-4 h-4 rounded border border-primary/60'></div>
            <span>Available</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-4 h-4 rounded bg-primary border-primary'></div>
            <span>Selected</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-4 h-4 rounded bg-yellow-400/40 border border-yellow-400 animate-pulse'></div>
            <span>Being Selected</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-4 h-4 rounded bg-red-500/30 border border-red-500/50 opacity-40'></div>
            <span>Booked</span>
          </div>
        </div>

        <div className='flex flex-col items-center mt-4 text-xs text-gray-300'>
          <div className='grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6'>
            {groupRows[0].map(row => renderSeats(row))}
          </div>
          <div className='grid grid-cols-2 gap-11'>
            {groupRows.slice(1).map((group, idx) => (
              <div key={idx}>
                {group.map(row => renderSeats(row))}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={bookTickets}
          className='flex items-center gap-1 mt-20 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95'
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  )
}

export default SeatLayout