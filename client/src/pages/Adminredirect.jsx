import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Loading from '../components/Loading'
import toast from 'react-hot-toast'
import { useUser, useAuth, useSignIn } from '@clerk/clerk-react'
import { useAppContext } from '../context/AppContext'
import { assets } from '../assets/assets'

const AdminRedirect = () => {
  const { isLoaded } = useUser()
  const { getToken, isSignedIn } = useAuth()
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn()
  const { axios } = useAppContext()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  
  const [step, setStep] = useState('login')
  const [loading, setLoading] = useState(false)

  
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!isLoaded || !isSignedIn) return
      try {
        const token = await getToken()
        const { data } = await axios.get('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (data.success) {
          toast.success('Welcome, Admin!')
          navigate('/admin')
        } else {
          toast.error('You are not authorized as an admin.')
          navigate('/')
        }
      } catch (error) {
        toast.error('Something went wrong. Please try again.')
        navigate('/')
      }
    }
    checkAndRedirect()
  }, [isLoaded, isSignedIn])

 
  const handleLogin = async (e) => {
    e.preventDefault()
    if (!signInLoaded) return
    setLoading(true)
    try {
      const result = await signIn.create({
        identifier: email,
        password: password,
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else if (result.status === 'needs_second_factor') {
        await signIn.prepareSecondFactor({ strategy: 'email_code' })
        toast.success('OTP sent to your email!')
        setStep('otp')
      } else {
        toast.error('Login failed. Please try again.')
      }
    } catch (error) {
      toast.error(error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  
  const handleOtp = async (e) => {
    e.preventDefault()
    if (!signInLoaded) return
    setLoading(true)
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code: otp,
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else {
        toast.error('OTP verification failed. Please try again.')
      }
    } catch (error) {
      toast.error(error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Invalid OTP.')
    } finally {
      setLoading(false)
    }
  }

  
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!signInLoaded) return
    setLoading(true)
    try {
      
      const { data } = await axios.post('/api/user/is-admin-email', { email })

      if (!data.isAdmin) {
        toast.error('This email is not registered as an admin.')
        setLoading(false)
        return
      }

      
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      })
      toast.success('OTP sent to your email!')
      setStep('forgot_otp')
    } catch (error) {
      toast.error(error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Email not found.')
    } finally {
      setLoading(false)
    }
  }

 
  const handleForgotOtp = async (e) => {
    e.preventDefault()
    if (!signInLoaded) return
    setLoading(true)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: otp,
      })
      if (result.status === 'needs_new_password') {
        toast.success('OTP verified! Set your new password.')
        setStep('reset_password')
      } else {
        toast.error('OTP verification failed.')
      }
    } catch (error) {
      toast.error(error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Invalid OTP.')
    } finally {
      setLoading(false)
    }
  }

  
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!signInLoaded) return

    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match!')
    }
    if (newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters.')
    }

    setLoading(true)
    try {
      const result = await signIn.resetPassword({
        password: newPassword,
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        toast.success('Password reset successful!')
      } else {
        toast.error('Password reset failed. Please try again.')
      }
    } catch (error) {
      toast.error(error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Password reset failed.')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) return <Loading />
  if (isSignedIn) return <Loading />

  return (
    <div className='min-h-screen flex items-center justify-center px-4'>
      <div className='w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur'>

        <div className='flex justify-center mb-6'>
          <img src={assets.logo} alt='QuickShow' className='w-32 h-auto' />
        </div>

       
        {step === 'login' && (
          <>
            <h2 className='text-2xl font-semibold text-center mb-1'>Admin Login</h2>
            <p className='text-gray-400 text-sm text-center mb-8'>Sign in with your admin credentials</p>
            <form onSubmit={handleLogin} className='space-y-5'>
              <div>
                <label className='block text-sm text-gray-300 mb-1'>Email</label>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='admin@example.com'
                  required
                  className='w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition'
                />
              </div>
              <div>
                <label className='block text-sm text-gray-300 mb-1'>Password</label>
                <input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••'
                  required
                  className='w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition'
                />
              </div>
              <div className='text-right'>
                <span
                  onClick={() => { setStep('forgot'); setOtp('') }}
                  className='text-sm text-primary cursor-pointer hover:underline'
                >
                  Forgot Password?
                </span>
              </div>
              <button
                type='submit'
                disabled={loading}
                className='w-full py-2.5 bg-primary hover:bg-primary-dull transition rounded-lg font-medium cursor-pointer active:scale-95 disabled:opacity-50'
              >
                {loading ? 'Signing in...' : 'Login as Admin'}
              </button>
            </form>
          </>
        )}

       
        {step === 'otp' && (
          <>
            <h2 className='text-2xl font-semibold text-center mb-1'>Two-Factor Auth</h2>
            <p className='text-gray-400 text-sm text-center mb-8'>Enter the OTP sent to your email</p>
            <form onSubmit={handleOtp} className='space-y-5'>
              <div>
                <label className='block text-sm text-gray-300 mb-1'>OTP Code</label>
                <input
                  type='text'
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder='Enter OTP'
                  required
                  maxLength={6}
                  className='w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition tracking-widest text-center text-lg'
                />
              </div>
              <button type='submit' disabled={loading}
                className='w-full py-2.5 bg-primary hover:bg-primary-dull transition rounded-lg font-medium cursor-pointer active:scale-95 disabled:opacity-50'>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type='button' onClick={() => setStep('login')}
                className='w-full py-2.5 border border-white/15 hover:bg-white/5 transition rounded-lg font-medium cursor-pointer text-sm text-gray-400'>
                Back to Login
              </button>
            </form>
          </>
        )}

        
        {step === 'forgot' && (
          <>
            <h2 className='text-2xl font-semibold text-center mb-1'>Forgot Password</h2>
            <p className='text-gray-400 text-sm text-center mb-8'>Enter your email to receive a reset OTP</p>
            <form onSubmit={handleForgotPassword} className='space-y-5'>
              <div>
                <label className='block text-sm text-gray-300 mb-1'>Email</label>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='admin@example.com'
                  required
                  className='w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition'
                />
              </div>
              <button type='submit' disabled={loading}
                className='w-full py-2.5 bg-primary hover:bg-primary-dull transition rounded-lg font-medium cursor-pointer active:scale-95 disabled:opacity-50'>
                {loading ? 'Sending OTP...' : 'Send Reset OTP'}
              </button>
              <button type='button' onClick={() => setStep('login')}
                className='w-full py-2.5 border border-white/15 hover:bg-white/5 transition rounded-lg font-medium cursor-pointer text-sm text-gray-400'>
                Back to Login
              </button>
            </form>
          </>
        )}

       
        {step === 'forgot_otp' && (
          <>
            <h2 className='text-2xl font-semibold text-center mb-1'>Verify OTP</h2>
            <p className='text-gray-400 text-sm text-center mb-8'>Enter the OTP sent to <span className='text-primary'>{email}</span></p>
            <form onSubmit={handleForgotOtp} className='space-y-5'>
              <div>
                <label className='block text-sm text-gray-300 mb-1'>OTP Code</label>
                <input
                  type='text'
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder='Enter OTP'
                  required
                  maxLength={6}
                  className='w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition tracking-widest text-center text-lg'
                />
              </div>
              <button type='submit' disabled={loading}
                className='w-full py-2.5 bg-primary hover:bg-primary-dull transition rounded-lg font-medium cursor-pointer active:scale-95 disabled:opacity-50'>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type='button' onClick={() => setStep('forgot')}
                className='w-full py-2.5 border border-white/15 hover:bg-white/5 transition rounded-lg font-medium cursor-pointer text-sm text-gray-400'>
                Back
              </button>
            </form>
          </>
        )}

        
        {step === 'reset_password' && (
          <>
            <h2 className='text-2xl font-semibold text-center mb-1'>Reset Password</h2>
            <p className='text-gray-400 text-sm text-center mb-8'>Enter your new password</p>
            <form onSubmit={handleResetPassword} className='space-y-5'>
              <div>
                <label className='block text-sm text-gray-300 mb-1'>New Password</label>
                <input
                  type='password'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder='••••••••'
                  required
                  className='w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition'
                />
              </div>
              <div>
                <label className='block text-sm text-gray-300 mb-1'>Confirm Password</label>
                <input
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder='••••••••'
                  required
                  className='w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition'
                />
              </div>
              <button type='submit' disabled={loading}
                className='w-full py-2.5 bg-primary hover:bg-primary-dull transition rounded-lg font-medium cursor-pointer active:scale-95 disabled:opacity-50'>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <p className='text-center text-sm text-gray-500 mt-6'>
          Not an admin?{' '}
          <span onClick={() => navigate('/')} className='text-primary cursor-pointer hover:underline'>
            Go back to Home
          </span>
        </p>
      </div>
    </div>
  )
}

export default AdminRedirect