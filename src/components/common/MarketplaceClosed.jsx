import { useEffect, useState } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import { formatMoroccoTime, getMarketplaceHours } from '../../config/operatingHours';

const MarketplaceClosed = ({ offline = false }) => {
  const [now, setNow] = useState(() => new Date());
  const hours = getMarketplaceHours(now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const opensTomorrow = hours.hour >= 22;
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem', background: 'linear-gradient(145deg, #f7fbff 0%, #edf7ff 48%, #ffffff 100%)' }}>
      <section style={{ width: 'min(100%, 600px)', padding: 'clamp(2rem, 7vw, 4rem)', textAlign: 'center', borderRadius: '28px', background: '#fff', boxShadow: '0 24px 70px rgba(7, 53, 94, 0.12)', border: '1px solid #d7eafd' }}>
        <div style={{ width: '58px', height: '58px', margin: '0 auto 1.5rem', display: 'grid', placeItems: 'center', borderRadius: '18px', background: '#e4f3ff', color: '#1684d8' }}><ClockIcon style={{ width: '30px', height: '30px' }} /></div>
        <p style={{ margin: '0 0 .65rem', color: '#1684d8', fontWeight: 800, letterSpacing: '.08em', fontSize: '.75rem' }}>RIFKANDO MARKETPLACE</p>
        <h1 style={{ margin: 0, color: '#081d3a', fontSize: 'clamp(1.8rem, 5vw, 2.7rem)', lineHeight: 1.12 }}>{offline ? 'We will be back shortly' : 'We are currently closed'}</h1>
        <p style={{ margin: '1.15rem auto 1.6rem', maxWidth: '430px', color: '#52647a', lineHeight: 1.7 }}>{offline ? 'Our marketplace connection is temporarily unavailable. This page will reopen automatically when service returns.' : 'We are preparing today’s marketplace operations. Products, FINDit, orders, and seller tools reopen automatically at 10:00 Morocco time.'}</p>
        <div style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: '#f5faff', color: '#163a60', fontWeight: 700 }}>Open every day · 10:00–22:00 <span style={{ color: '#1684d8' }}>Africa/Casablanca</span></div>
        <p style={{ margin: '1.3rem 0 0', color: '#728197', fontSize: '.9rem' }}>Morocco time now: {formatMoroccoTime(now)}{offline ? ' · Checking the connection automatically' : ` · ${opensTomorrow ? 'Opening tomorrow at 10:00' : 'Opening today at 10:00'}`}</p>
      </section>
    </main>
  );
};

export default MarketplaceClosed;
