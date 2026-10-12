import { Component } from 'react';
import { reportClientError } from '../../services/errorTracking';

/**
 * Last-resort client recovery for rendering failures. It deliberately does not
 * depend on routing, authentication, translations, or API state so a failure
 * in any of those layers cannot turn the storefront into a blank page.
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep diagnostic data local to the browser console. Do not expose stack
    // traces or internal API details to marketplace visitors.
    console.error('rifKANDO application render failed.', error, info);
    void reportClientError(error);
  }

  reload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main
          aria-live="assertive"
          style={{
            alignItems: 'center',
            background: 'linear-gradient(145deg, #f6fbff 0%, #ffffff 56%, #edf8ff 100%)',
            color: '#0A1B35',
            display: 'flex',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <section style={{ background: '#ffffff', border: '1px solid rgba(10, 27, 53, .1)', borderRadius: '1.25rem', boxShadow: '0 18px 48px rgba(10, 27, 53, .12)', maxWidth: '32rem', padding: '2rem' }}>
            <span style={{ color: '#0877BF', fontSize: '.75rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>rifKANDO</span>
            <h1 style={{ fontSize: 'clamp(1.45rem, 4vw, 2rem)', margin: '.55rem 0 .75rem' }}>We could not load this page</h1>
            <p style={{ color: '#52687e', lineHeight: 1.6, margin: '0 auto 1.35rem', maxWidth: '27rem' }}>Your data has not changed. Refresh rifKANDO to safely try again.</p>
            <button type="button" onClick={this.reload} style={{ background: '#0877BF', border: 0, borderRadius: '.7rem', color: '#ffffff', cursor: 'pointer', font: 'inherit', fontWeight: 800, padding: '.78rem 1.1rem' }}>Refresh rifKANDO</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
