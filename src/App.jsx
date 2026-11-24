import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import MatchCard from "./MatchCard.jsx";
import { supabase } from "./supabase";

function App() {
  const [matches, setMatches] = useState([]);
  const [savedMatchIds, setSavedMatchIds] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [bookingMessage, setBookingMessage] = useState("");

  async function loadMatches() {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("id");

    if (error) {
      setError(error.message);
    } else {
      setError("");
      setMatches(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMatches();

    const channel = supabase
      .channel("matches-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => loadMatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function toggleSavedMatch(id) {
    setSavedMatchIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((savedId) => savedId !== id)
        : [...currentIds, id]
    );
  }

  async function bookMatch(match) {
    setBookingMessage("");

    const userName = window.prompt("What is your name?");
    if (!userName?.trim()) return;

    const ticketAnswer = window.prompt("How many tickets?");
    const tickets = Number(ticketAnswer);

    if (!Number.isInteger(tickets) || tickets < 1) {
      setBookingMessage("Enter a ticket quantity of 1 or more.");
      return;
    }

    if (tickets > match.available_seats) {
      setBookingMessage("There are not enough seats available.");
      return;
    }

    // Reduce seats only if the database still has enough.
    const { data: updatedRows, error: updateError } = await supabase
      .from("matches")
      .update({ available_seats: match.available_seats - tickets })
      .eq("id", match.id)
      .gte("available_seats", tickets)
      .select("id");

    if (updateError) {
      setBookingMessage(`Could not update seats: ${updateError.message}`);
      return;
    }

    if (!updatedRows?.length) {
      setBookingMessage("Seats changed. Please try booking again.");
      return;
    }

    const { error: bookingError } = await supabase
      .from("bookings")
      .insert({
        match_id: match.id,
        user_name: userName.trim(),
        match_title: `${match.team1} vs ${match.team2}`,
        tickets,
        total_price: match.price * tickets,
      });

    if (bookingError) {
      // Restore the seats if saving the booking failed.
      await supabase
        .from("matches")
        .update({ available_seats: match.available_seats })
        .eq("id", match.id);

      setBookingMessage(`Could not save booking: ${bookingError.message}`);
      return;
    }

    setBookingMessage("Booking saved!");
    await loadMatches();
  }

  if (loading) return <p>Loading matches…</p>;
  if (error) return <p>Could not load matches: {error}</p>;

  return (
    <>
      <Navbar />
      <Hero />

      <main>
        <h2>Upcoming matches</h2>
        {bookingMessage && <p>{bookingMessage}</p>}

        {matches.map((match) => (
          <MatchCard
            key={match.id}
            homeTeam={match.team1}
            awayTeam={match.team2}
            date={match.date}
            venue={match.venue}
            price={match.price}
            availableSeats={match.available_seats}
            isSaved={savedMatchIds.includes(match.id)}
            onToggleSave={() => toggleSavedMatch(match.id)}
            onBook={() => bookMatch(match)}
          />
        ))}
      </main>
    </>
  );
}

export default App;