const LoadMoreButton = ({ hasMore, isLoading, onLoadMore, itemLabel = 'items' }) => {
  if (!hasMore) return null;

  return (
    <div className="catalog-load-more">
      <button
        className="catalog-load-more-button"
        type="button"
        onClick={onLoadMore}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? `Loading ${itemLabel}...` : `Load more ${itemLabel}`}
      </button>

      <style>{`
        .catalog-load-more {
          display: flex;
          justify-content: center;
          padding: 2rem 0 0;
        }
        .catalog-load-more-button {
          min-height: 2.75rem;
          padding: 0.7rem 1.25rem;
          border: 1px solid #216275;
          border-radius: 0.65rem;
          background: #fff;
          color: #216275;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        .catalog-load-more-button:hover:not(:disabled) {
          background: #216275;
          color: #fff;
          transform: translateY(-1px);
        }
        .catalog-load-more-button:disabled {
          cursor: progress;
          opacity: 0.7;
        }
        .catalog-load-more-button:focus-visible {
          outline: 3px solid rgba(33, 98, 117, 0.35);
          outline-offset: 3px;
        }
      `}</style>
    </div>
  );
};

export default LoadMoreButton;
