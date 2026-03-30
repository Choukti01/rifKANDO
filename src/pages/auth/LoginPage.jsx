import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false })
  const [errors, setErrors] = useState({})

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    const result = await login(formData.email, formData.password)
    setIsLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setErrors({ submit: result.error || 'Invalid email or password' })
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'linear-gradient(135deg, rgba(135,206,235,0.05) 0%, #ffffff 100%)'
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        background: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 20px 35px -10px rgba(0,0,0,0.1)',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#87CEEB',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 'bold',
            margin: '0 auto 1rem'
          }}>
            R
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome Back</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Sign in to your RifKANDI account</p>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            {errors.submit}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <EnvelopeIcon style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1.25rem',
                height: '1.25rem',
                color: '#9ca3af'
              }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  border: `1px solid ${errors.email ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#87CEEB'
                  e.target.style.boxShadow = '0 0 0 3px rgba(135,206,235,0.1)'
                }}
                onBlur={(e) => {
                  if (!errors.email) e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            {errors.email && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <LockClosedIcon style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1.25rem',
                height: '1.25rem',
                color: '#9ca3af'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  border: `1px solid ${errors.password ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  paddingRight: '2.5rem'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#87CEEB'
                  e.target.style.boxShadow = '0 0 0 3px rgba(135,206,235,0.1)'
                }}
                onBlur={(e) => {
                  if (!errors.password) e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af'
                }}
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.password}
              </span>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                style={{ width: '1rem', height: '1rem' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Remember me</span>
            </label>
            <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: '#87CEEB', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: '#1a1a1a',
              color: 'white',
              border: 'none',
              borderRadius: '9999px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: isLoading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.target.style.background = '#2c2c2c'
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.target.style.background = '#1a1a1a'
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Sign Up Link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#87CEEB', fontWeight: 500, textDecoration: 'none' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage