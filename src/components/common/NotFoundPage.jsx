import { Link } from 'react-router-dom'
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const NotFoundPage = () => {
  const { t } = useTranslation()

  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="not-found__card">
        <span className="not-found__code">404</span>
        <h1 id="not-found-title">{t('notFound.title')}</h1>
        <p>{t('notFound.lead')}</p>
        <div className="not-found__actions">
          <Link to="/" className="not-found__primary"><HomeIcon aria-hidden="true" />{t('notFound.home')}</Link>
          <Link to="/products" className="not-found__secondary"><MagnifyingGlassIcon aria-hidden="true" />{t('notFound.products')}</Link>
        </div>
      </div>
      <style>{`
        .not-found { align-items: center; display: grid; min-height: min(68vh, 44rem); padding: 2rem 1rem; place-items: center; }
        .not-found__card { background: linear-gradient(145deg, #fff, #f4fbff); border: 1px solid #dcebf3; border-radius: 1.25rem; box-shadow: 0 1.25rem 3.5rem rgba(16, 35, 63, .08); max-width: 36rem; padding: clamp(2rem, 7vw, 4rem); text-align: center; }
        .not-found__code { color: #168dd9; display: block; font-size: clamp(4rem, 14vw, 7rem); font-weight: 900; letter-spacing: -.08em; line-height: .9; }
        .not-found h1 { color: #10233f; font-size: clamp(1.5rem, 4vw, 2rem); margin: 1.25rem 0 .65rem; }
        .not-found p { color: #607187; line-height: 1.6; margin: 0 auto; max-width: 30rem; }
        .not-found__actions { display: flex; flex-wrap: wrap; gap: .75rem; justify-content: center; margin-top: 1.75rem; }
        .not-found__actions a { align-items: center; border-radius: .7rem; display: inline-flex; font-weight: 800; gap: .5rem; justify-content: center; min-height: 2.8rem; padding: .65rem 1rem; text-decoration: none; }
        .not-found__actions svg { height: 1rem; width: 1rem; }
        .not-found__primary { background: #168dd9; color: #fff; }
        .not-found__primary:hover { background: #0877bf; }
        .not-found__secondary { border: 1px solid #bed8e6; color: #216275; }
        .not-found__secondary:hover { background: #eaf7fc; }
      `}</style>
    </section>
  )
}

export default NotFoundPage
