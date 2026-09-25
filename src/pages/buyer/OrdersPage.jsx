import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import { 
  EyeIcon, 
  TruckIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  CreditCardIcon, 
  BanknotesIcon, 
  WalletIcon,
  CubeIcon 
} from '@heroicons/react/24/outline'
import EmptyState from '../../components/common/EmptyState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { useTranslation } from 'react-i18next'

const OrdersPage = () => {
  const { t, i18n } = useTranslation()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) return undefined

    let isCurrent = true

    const loadOrders = async () => {
      try {
        const response = await api.get('/orders')
        if (isCurrent) setOrders(response.data.orders || [])
      } catch (error) {
        if (isCurrent) {
          console.error('Failed to fetch orders:', error)
          toast.error(t('buyer.orders.loadFailed'))
        }
      } finally {
        if (isCurrent) setLoading(false)
      }
    }

    void loadOrders()

    return () => {
      isCurrent = false
    }
  }, [isAuthenticated, t])

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: ClockIcon, text: t('buyer.orders.status.pending'), color: '#f59e0b', bg: '#fef3c7' },
      processing: { icon: CubeIcon, text: t('buyer.orders.status.processing'), color: '#3b82f6', bg: '#dbeafe' },
      shipped: { icon: TruckIcon, text: t('buyer.orders.status.shipped'), color: '#8b5cf6', bg: '#ede9fe' },
      delivered: { icon: CheckCircleIcon, text: t('buyer.orders.status.delivered'), color: '#10b981', bg: '#d1fae5' },
      cancelled: { icon: CubeIcon, text: t('buyer.orders.status.cancelled'), color: '#ef4444', bg: '#fee2e2' }
    }
    return configs[status] || configs.pending
  }

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash': return <BanknotesIcon style={{ width: '1rem', height: '1rem' }} />
      case 'cmi': return <CreditCardIcon style={{ width: '1rem', height: '1rem' }} />
      case 'wallet': return <WalletIcon style={{ width: '1rem', height: '1rem' }} />
      default: return <BanknotesIcon style={{ width: '1rem', height: '1rem' }} />
    }
  }

  const getPaymentText = (method) => {
    switch (method) {
      case 'cash': return t('buyer.cashOnDelivery')
      case 'cmi': return t('buyer.orders.creditCard')
      case 'wallet': return t('buyer.orders.wallet')
      default: return method || t('buyer.orders.unknown')
    }
  }

  const downloadInvoice = async (orderId, orderNumber) => {
    setDownloading(orderId)
    try {
      const response = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice-${orderNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(t('buyer.orders.invoiceDownloaded'))
    } catch (error) {
      console.error('Failed to download invoice:', error)
      toast.error(t('buyer.orders.invoiceFailed'))
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem 0' }}>
        <LoadingSkeleton variant="list" count={4} label={t('buyer.orders.loading')} />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<CubeIcon style={{ width: '1.5rem' }} />}
          title={t('buyer.orders.emptyTitle')}
          description={t('buyer.orders.emptyLead')}
          action={<Link to="/products" className="btn btn-primary">{t('buyer.orders.startShopping')}</Link>}
        />
      </div>
    )
  }

  return (
    <div className="orders-page">
      <div className="container">
        <div className="orders-header">
          <h1>{t('buyer.orders.title')}</h1>
          <p className="orders-count">{t('buyer.orders.count', { count: orders.length })}</p>
        </div>

        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('buyer.orders.orderId')}</th>
                <th>{t('buyer.orders.items')}</th>
                <th>{t('buyer.total')}</th>
                <th>{t('buyer.payment')}</th>
                <th>{t('buyer.orders.statusLabel')}</th>
                <th>{t('buyer.orders.date')}</th>
                <th>{t('buyer.orders.action')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusConfig = getStatusConfig(order.status)
                const StatusIcon = statusConfig.icon
                return (
                  <tr key={order.id}>
                    <td className="order-id">
                      <span className="order-number">{order.order_number}</span>
                      {order.order_type === 'findit' && <span className="findit-order-label">FINDit</span>}
                    </td>
                    <td className="order-items">
                      <span className="items-count">{t('buyer.items', { count: order.item_count || 1 })}</span>
                    </td>
                    <td className="order-amount">
                      <span className="amount">{Number(order.total || 0).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-MA' : 'en-MA')} MAD</span>
                    </td>
                    <td className="payment-method">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {getPaymentIcon(order.payment_method)}
                        {getPaymentText(order.payment_method)}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                        <StatusIcon style={{ width: '0.75rem', height: '0.75rem' }} />
                        {statusConfig.text}
                      </span>
                    </td>
                    <td className="order-date">
                      {new Date(order.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-MA' : 'en-MA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="order-action">
                      <Link to={`/orders/${order.id}`} className="view-order-btn">
                        <EyeIcon style={{ width: '1rem', height: '1rem' }} />
                        {t('buyer.orders.view')}
                      </Link>
                      <button 
                        onClick={() => downloadInvoice(order.id, order.order_number)} 
                        className="invoice-btn"
                        disabled={downloading === order.id}
                      >
                        {downloading === order.id ? '...' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .orders-page { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .orders-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .orders-header h1 { font-size: 1.75rem; font-weight: 700; margin: 0; }
        .orders-count { color: #6b7280; font-size: 0.875rem; background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 2rem; }
        .orders-table-container { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); border-radius: 1rem; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid rgba(255,255,255,0.3); }
        .orders-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .orders-table thead th { text-align: left; padding: 1rem 1.25rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
        .orders-table tbody td { padding: 1rem 1.25rem; font-size: 0.875rem; border-bottom: 1px solid #f3f4f6; }
        .orders-table tbody tr:hover { background: rgba(135, 206, 235, 0.05); }
        .order-number { font-weight: 600; font-family: monospace; font-size: 0.8rem; background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.375rem; }
        .findit-order-label { background: var(--color-brand-soft); border-radius: 999px; color: var(--color-brand-ink); display: inline-block; font-size: 0.65rem; font-weight: 800; margin-left: 0.4rem; padding: 0.2rem 0.45rem; }
        .amount { font-weight: 600; color: #1a1a1a; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 500; }
        .order-date { color: #6b7280; font-size: 0.75rem; }
        .order-action { display: flex; gap: 0.5rem; align-items: center; }
        .view-order-btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.875rem; background: #f3f4f6; border-radius: 2rem; text-decoration: none; font-size: 0.75rem; font-weight: 500; color: #374151; transition: all 0.2s; }
        .view-order-btn:hover { background: #e5e7eb; transform: translateY(-1px); }
        .invoice-btn { background: none; border: none; color: #6b7280; font-size: 0.75rem; cursor: pointer; padding: 0.375rem 0.875rem; border-radius: 2rem; transition: all 0.2s; }
        .invoice-btn:hover { background: #f3f4f6; color: #87CEEB; }
        .invoice-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { display: inline-block; padding: 0.75rem 1.5rem; background: #1a1a1a; color: white; text-decoration: none; border-radius: 2rem; }
      `}</style>
    </div>
  )
}

export default OrdersPage
