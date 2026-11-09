export default function LocationNotFound() {
  return (
    <section className="location-not-found" aria-label="Location access is unavailable">
      <svg
        className="location-not-found-icon"
        viewBox="0 0 64 64"
        role="img"
        aria-label="Location disabled"
      >
        <path
          d="M32 57S13 38.5 13 24a19 19 0 1 1 38 0C51 38.5 32 57 32 57Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="24" r="6" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M9 55 55 9" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
        <path d="M9 55 55 9" stroke="#ef6868" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <strong>Location not found!</strong>
      <p>Allow location access for the full experience.</p>
    </section>
  );
}
