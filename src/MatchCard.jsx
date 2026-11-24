function MatchCard({
  homeTeam,
  awayTeam,
  date,
  venue,
  price,
  availableSeats,
  isSaved,
  onToggleSave,
  onBook,
}) {
  return (
    <article>
      <h2>{homeTeam} vs {awayTeam}</h2>
      <p>{date} · {venue}</p>
      <p>Price: ₹{price}</p>
      <p>Available seats: {availableSeats}</p>

      <button onClick={onToggleSave}>
        {isSaved ? "Saved ✓" : "Save match"}
      </button>

      <button onClick={onBook}>Book tickets</button>
    </article>
  );
}

export default MatchCard;