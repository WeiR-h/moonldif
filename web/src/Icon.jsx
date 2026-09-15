import React from 'react';
const paths = {
  folder: <path d="M3 7h7l2 2h9v11H3zM3 7V4h7l2 3" />,
  refresh: <><path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5" /></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 14v7h16v-7" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="1" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 6v7m0 3v1" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m7 12 3 3 7-7" /></>,
};
export function Icon({ name, className = '' }) { return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.alert}</svg>; }
