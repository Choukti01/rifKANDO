import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EnvelopeIcon, LockClosedIcon, UserIcon, PhoneIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', agreeTerms: false
  })
  const [errors, setErrors] = useState({})

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name) newErrors.name = 'Full name is required'
    else if (formData.name.length < 2) newErrors.name = 'Name must be at least 2 characters'
    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    if (!formData.phone) newErrors.phone = 'Phone number is required'
    else if (!/^[0-9]{10}$/.test(formData.phone)) newErrors.phone = 'Enter a valid 10-digit phone number'
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    const result = await register({ name: formData.name, email: formData.email, phone: formData.phone, password: formData.password })
    setIsLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setErrors({ submit: result.error || 'Registration failed' })
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
        maxWidth: '500px',
        width: '100%',
        background: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 20px 35px -10px rgba(0,0,0,0.1)',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Create Account</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Join RifKANDI today</p>
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
          {/* Full Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1.25rem',
                height: '1.25rem',
                color: '#9ca3af'
              }} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ahmed Benjelloun"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  border: `1px solid ${errors.name ? '#ef4444' : '#e5e7eb'}`,
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
                  if (!errors.name) e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            {errors.name && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.name}</span>}
          </div>

          {/* Email */}
          <div style={{ marginBottom: '1rem' }}>
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
            {errors.email && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.email}</span>}
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Phone Number
            </label>
            <div style={{ position: 'relative' }}>
              <PhoneIcon style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1.25rem',
                height: '1.25rem',
                color: '#9ca3af'
              }} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0612345678"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  border: `1px solid ${errors.phone ? '#ef4444' : '#e5e7eb'}`,
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
                  if (!errors.phone) e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            {errors.phone && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.phone}</span>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1rem' }}>
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
            {errors.password && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Confirm Password
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
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  border: `1px solid ${errors.confirmPassword ? '#ef4444' : '#e5e7eb'}`,
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
                  if (!errors.confirmPassword) e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.confirmPassword}</span>}
          </div>

          {/* Terms & Conditions */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                style={{ width: '1rem', height: '1rem' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                I agree to the <Link to="/terms" style={{ color: '#87CEEB', textDecoration: 'none' }}>Terms of Service</Link> and <Link to="/privacy" style={{ color: '#87CEEB', textDecoration: 'none' }}>Privacy Policy</Link>
              </span>
            </label>
            {errors.agreeTerms && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.agreeTerms}</span>}
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
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Sign In Link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#87CEEB', fontWeight: 500, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage