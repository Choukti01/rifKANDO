import { ArrowPathIcon } from '@heroicons/react/24/outline';

const MarketplaceClosed = () => {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem', background: 'linear-gradient(145deg, #f7fbff 0%, #edf7ff 48%, #ffffff 100%)' }}>
      <section style={{ width: 'min(100%, 600px)', padding: 'clamp(2rem, 7vw, 4rem)', textAlign: 'center', borderRadius: '28px', background: '#fff', boxShadow: '0 24px 70px rgba(7, 53, 94, 0.12)', border: '1px solid #d7eafd' }}>
        <div style={{ width: '58px', height: '58px', margin: '0 auto 1.5rem', display: 'grid', placeItems: 'center', borderRadius: '18px', background: '#e4f3ff', color: '#1684d8' }}><ArrowPathIcon style={{ width: '30px', height: '30px' }} /></div>
        <p style={{ margin: '0 0 .65rem', color: '#1684d8', fontWeight: 800, letterSpacing: '.08em', fontSize: '.75rem' }}>RIFKANDO MARKETPLACE</p>
        <h1 style={{ margin: 0, color: '#081d3a', fontSize: 'clamp(1.8rem, 5vw, 2.7rem)', lineHeight: 1.12 }}>We will be back shortly</h1>
        <p style={{ margin: '1.15rem auto 1.6rem', maxWidth: '430px', color: '#52647a', lineHeight: 1.7 }}>Our marketplace connection is temporarily unavailable. No data has been changed. This page will reopen automatically when the service returns.</p>
        <p style={{ margin: '1.3rem 0 0', color: '#728197', fontSize: '.9rem' }}>Checking the connection automatically</p>
      </section>
    </main>
  );
};

export default MarketplaceClosed;
