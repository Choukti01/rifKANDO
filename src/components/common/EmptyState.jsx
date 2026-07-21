import React from 'react';

const EmptyState = ({ icon, title, description, action }) => (
  <section className="empty-state" aria-live="polite">
    {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
    <h2 className="empty-state-title">{title}</h2>
    {description && <p className="empty-state-description">{description}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </section>
);

export default EmptyState;
