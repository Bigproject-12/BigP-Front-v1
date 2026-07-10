const PATHS = {
  logo: 'M6 3h9a6 6 0 0 1 0 12h-5v6H6zm4 3.6v5.4h5a2.7 2.7 0 0 0 0-5.4z',
  home: 'M4 11.5 12 5l8 6.5M6 10v9h5v-5h2v5h5v-9',
  spark: 'M12 3v4M12 17v4M5 12H1M23 12h-4M6.3 6.3 3.5 3.5M17.7 6.3l2.8-2.8M6.3 17.7l-2.8 2.8M17.7 17.7l2.8 2.8',
  code: 'm8 9-4 3 4 3M16 9l4 3-4 3M13.5 6l-3 12',
  repo: 'M5 4h11a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2Z M5 4v0',
  board: 'M4 5h16v13a1 1 0 0 1-1 1H4zM4 9h16M8 13h8M8 16.5h5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  logout: 'M10 6V4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5v-2M14 8l4 4-4 4M18 12H8',
  bell: 'M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10ZM10 18.5a2 2 0 0 0 4 0',
  sun: 'M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1 3.5 20.5M20.5 3.5l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  moon: 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z',
  eye: 'M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M6.6 6.7C4 8.3 2 12 2 12s3.5 6.5 10 6.5c1.7 0 3.2-.4 4.4-1M9.9 5.6A11 11 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a15 15 0 0 1-2.6 3.4',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  edit: 'M12.5 5.5 18 11l-9.5 9.5H3V15Zm3-3L20 7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  check: 'm4 12 6 6 10-12',
  close: 'M6 6l12 12M18 6 6 18',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  filter: 'M4 5h16M7 12h10M10 19h4',
  pr: 'M7 4v11M17 9v9M7 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM17 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM10 6c3 0 4 1.5 4 3',
  bug: 'M9 4v2M15 4v2M8 8h8a4 4 0 0 1 4 4v2a6 6 0 0 1-12 0v-2a4 4 0 0 1 4-4ZM4 12h2M18 12h2M5.5 7.5 7 9M18.5 7.5 17 9M5.5 17l1.7-1.5M18.5 17l-1.7-1.5',
  upload: 'M12 16V6M7 10l5-5 5 5M4 19h16',
  compare: 'M8 3v18M16 3v18M4 8l4-4M12 8l4-4M4 19l4-4M12 19l4-4',
  star: 'M12 3.5 14.6 9.2 20.8 9.9 16.2 14.1 17.5 20.3 12 17.1 6.5 20.3 7.8 14.1 3.2 9.9 9.4 9.2Z',
  grip: 'M8 5h.01M8 12h.01M8 19h.01M16 5h.01M16 12h.01M16 19h.01',
};

export default function Icon({ name, size = 18, strokeWidth = 1.7, className, filled = false, ...rest }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
