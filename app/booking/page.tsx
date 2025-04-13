'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TOTAL_SEATS = 80;
const ROWS = 12;

interface Seat {
  seatNumber: number;
  row: number;
  col: number;
}

const BookingPage = () => {
  const [bookedSeats, setBookedSeats] = useState<number[]>([]);
  const [allocatedSeats, setAllocatedSeats] = useState<Seat[]>([]);
  const [numSeats, setNumSeats] = useState<number>(1);
  const [userId, setUserId] = useState<number | null>(null);

  // ✅ Fetch all booked seats and set userId
  useEffect(() => {
    const fetchBookedSeats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/seat/get-all');
        const seatData = res.data;
        const booked = seatData.map((s: any) => s.seat_number);
        setBookedSeats(booked);
      } catch (err) {
        console.error('❌ Failed to fetch booked seats:', err);
      }
    };

    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(Number(storedUserId));
    } else {
      alert("User not logged in! Please login first.");
    }

    fetchBookedSeats();
  }, []);

  // ✅ Algorithm to allocate best seats
  const allocateSeats = (numSeats: number): Seat[] => {
    const allSeats: Seat[] = [];
    let seatNumber = 1;

    for (let row = 1; row <= ROWS; row++) {
      const cols = row === 12 ? 3 : 7;
      for (let col = 1; col <= cols; col++) {
        allSeats.push({ seatNumber, row, col });
        seatNumber++;
      }
    }

    const availableSeats = allSeats.filter(
      (seat) => !bookedSeats.includes(seat.seatNumber)
    );

    // Priority 1: Same row
    for (let row = 1; row <= ROWS; row++) {
      const rowSeats = availableSeats.filter((s) => s.row === row);
      rowSeats.sort((a, b) => a.col - b.col);
      for (let i = 0; i <= rowSeats.length - numSeats; i++) {
        const group = rowSeats.slice(i, i + numSeats);
        if (group.length === numSeats) return group;
      }
    }

    // Fallback
    if (availableSeats.length >= numSeats) {
      return availableSeats.slice(0, numSeats);
    }

    return [];
  };

  // ✅ Handle booking
  const handleBooking = async () => {
    if (!userId) {
      alert("User not logged in");
      return;
    }

    const seatsToBook = allocateSeats(numSeats);

    if (seatsToBook.length !== numSeats) {
      alert('Not enough seats available!');
      return;
    }

    const payload = {
      userId,
      seatList: seatsToBook,
    };

    try {
      const res = await axios.post('http://localhost:5000/api/seat/create', payload);
      const newBooked = seatsToBook.map((s) => s.seatNumber);
      setBookedSeats((prev) => [...prev, ...newBooked]);
      setAllocatedSeats(seatsToBook);
    } catch (error: any) {
      console.error('❌ Booking failed:', error.response?.data || error.message);
      alert('Booking failed. Please try again!');
    }
  };

  // ✅ Handle Reset (delete allocated seats from DB)
  const handleReset = async () => {
    if (!userId || allocatedSeats.length === 0) return;

    try {
      const seatNumbers = allocatedSeats.map((s) => s.seatNumber);

      // Call DELETE API for each seat
      await Promise.all(
        seatNumbers.map((seatNumber) =>
          axios.delete('http://localhost:5000/api/seat/delete', {
            data: { userId, seatNumber },
          })
        )
      );

      // Remove from UI
      setBookedSeats((prev) => prev.filter((seat) => !seatNumbers.includes(seat)));
      setAllocatedSeats([]);
      alert('Seats reset successfully.');
    } catch (err) {
      console.error('❌ Reset failed:', err);
      alert('Something went wrong during reset.');
    }
  };

  // ✅ Handle seat click (deselect)
  const handleSeatClick = async (seatNumber: number) => {
    const seatToDelete = allocatedSeats.find((s) => s.seatNumber === seatNumber);
    if (!seatToDelete || !userId) return;

    try {
      await axios.delete('http://localhost:5000/api/seat/delete', {
        data: { userId, seatNumber },
      });

      setBookedSeats((prev) => prev.filter((s) => s !== seatNumber));
      setAllocatedSeats((prev) => prev.filter((s) => s.seatNumber !== seatNumber));
    } catch (err) {
      console.error('❌ Delete failed:', err);
      alert('Failed to remove seat. Try again.');
    }
  };

  // ✅ Render seat grid
  const renderSeats = () => {
    const seats = [];
    let seatNumber = 1;

    for (let row = 1; row <= ROWS; row++) {
      const cols = row === 12 ? 3 : 7;
      const rowSeats = [];

      for (let col = 1; col <= cols; col++) {
        const isBooked = bookedSeats.includes(seatNumber);
        const isAllocated = allocatedSeats.find((s) => s.seatNumber === seatNumber);

        rowSeats.push(
          <div
            key={seatNumber}
            onClick={() => isAllocated && handleSeatClick(seatNumber)}
            className={`w-10 h-10 m-1 flex items-center justify-center rounded text-sm font-semibold border cursor-pointer
              ${isBooked ? 'bg-red-400 text-white cursor-not-allowed' :
                isAllocated ? 'bg-yellow-300 hover:bg-yellow-400' : 'bg-green-300 hover:bg-green-400'}`}
          >
            {seatNumber}
          </div>
        );
        seatNumber++;
      }

      seats.push(
        <div key={row} className="flex justify-center mb-1">
          {rowSeats}
        </div>
      );
    }

    return seats;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg flex p-6 w-full max-w-6xl">
        {/* Seat Grid */}
        <div className="w-3/4 border p-4 rounded-lg bg-gray-50">
          <h2 className="text-xl font-bold mb-4 text-center">🚆 Train Seat Booking</h2>
          <div className="mb-6">{renderSeats()}</div>
        </div>

        {/* Controls */}
        <div className="w-1/4 pl-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-3">Enter Seats</h3>
            <label className="block text-sm mb-1">Seats (1 to 7):</label>
            <input
              type="number"
              value={numSeats}
              onChange={(e) => setNumSeats(Math.min(7, Math.max(1, Number(e.target.value))))}
              min={1}
              max={7}
              className="w-full p-2 border rounded mb-3"
            />
            <button
              onClick={handleBooking}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 mb-2"
            >
              Book Now
            </button>
            <button
            onClick={handleReset}
            className="w-full bg-gray-300 text-black py-2 rounded hover:bg-gray-400 mt-4"
          >
            Reset Allocation
          </button>
          <div className="text-center text-sm font-medium mt-16">
            <p className="mb-1">✅ Available Seats: {TOTAL_SEATS - bookedSeats.length}</p>
            <p className="text-red-500">❌ Booked Seats: {bookedSeats.length}</p>
            <p className="text-yellow-600">🟡 Last Allocated: {allocatedSeats.map(s => s.seatNumber).join(', ') || '-'}</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
