import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../../assets/assets'
import { UserButton } from '@clerk/clerk-react'
import { TicketPlus } from 'lucide-react'

const AdminNavbar = () => {
  const navigate = useNavigate()

  return (
    <div className='flex items-center justify-between px-6 md:px-10 h-16 border-b border-gray-300/30'>
      <Link to="/">
        <img src={assets.logo} alt="logo" className="w-36 h-auto" />
      </Link>

      <UserButton>
        <UserButton.MenuItems>
          <UserButton.Action
            label="My Bookings"
            labelIcon={<TicketPlus width={15} />}
            onClick={() => navigate('/my-bookings')}
          />
        </UserButton.MenuItems>
      </UserButton>
    </div>
  )
}

export default AdminNavbar