"use client";
import React, { useState } from 'react';
import Image from 'next/image';

export default function ApplicationPage() {
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB]">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-6 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Bookiji Logo" width={32} height={32} />
          <span className="font-bold text-2xl text-[#A259FF] tracking-tight">Bookiji</span>
        </div>
        <button className="w-12 h-6 rounded-full bg-gray-200 flex items-center p-1 transition-colors duration-300">
          <span className="w-4 h-4 bg-[#A259FF] rounded-full block"></span>
        </button>
      </header>

      {/* Hero Booking Section */}
      <main className="flex flex-col items-center justify-center flex-1 px-4">
        {/* Abstract Map */}
        <div className="relative w-full max-w-3xl h-72 mb-8">
          <svg width="100%" height="100%" viewBox="0 0 800 288" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
            <ellipse cx="400" cy="144" rx="350" ry="100" fill="#E9D5FF" fillOpacity="0.6" />
            <ellipse cx="500" cy="144" rx="180" ry="60" fill="#A259FF" fillOpacity="0.3" />
            <ellipse cx="300" cy="144" rx="100" ry="40" fill="#A259FF" fillOpacity="0.2" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl text-[#A259FF] font-semibold opacity-70">Available Slots Near You</span>
          </div>
        </div>
        {/* Conversational AI Input */}
        <div className="flex flex-col items-center w-full max-w-xl mb-6">
          <input
            type="text"
            className="w-full px-6 py-4 rounded-full border-2 border-[#A259FF] text-lg focus:outline-none focus:ring-2 focus:ring-[#A259FF] bg-white shadow"
            placeholder="What do you want to book? (e.g. haircut, massage, tennis court)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {/* Book Now Button */}
        <button
          className="px-12 py-4 rounded-full bg-[#A259FF] text-white text-xl font-bold shadow-lg hover:bg-[#7C3AED] transition-all animate-pulse-ring mb-8"
        >
          Book Now
        </button>
      </main>

      {/* Collapsed Sections */}
      <section className="w-full max-w-2xl mx-auto flex flex-col gap-4 mb-8">
        <details className="bg-white rounded-xl shadow p-4">
          <summary className="font-semibold text-[#A259FF] cursor-pointer text-lg">How it Works</summary>
          <ol className="list-decimal list-inside space-y-2 text-gray-800 mt-2">
            <li>Describe what you want to book (chat, voice, or search)</li>
            <li>See instant, privacy-protected options</li>
            <li>Book with $1, get instant confirmation</li>
            <li>Show up, earn rewards, build your reliability</li>
          </ol>
        </details>
        <details className="bg-white rounded-xl shadow p-4">
          <summary className="font-semibold text-[#A259FF] cursor-pointer text-lg">Testimonials</summary>
          <p className="italic text-gray-600 mt-2">"Bookiji made booking so easy and reliable!"</p>
          <p className="italic text-gray-600">"No more no-shows. I love the $1 guarantee."</p>
        </details>
        <details className="bg-white rounded-xl shadow p-4">
          <summary className="font-semibold text-[#A259FF] cursor-pointer text-lg">FAQ</summary>
          <p className="mb-1 mt-2"><b>How does the $1 fee work?</b> It guarantees your spot and reduces no-shows.</p>
          <p className="mb-1"><b>What if my provider cancels?</b> You get rematched or compensated automatically.</p>
          <p className="mb-1"><b>How is my privacy protected?</b> Provider locations are abstracted until booking is confirmed.</p>
        </details>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-4 text-center text-gray-600 border-t">
        About | Contact | Provider Onboarding | Beta Feedback | Legal
      </footer>
    </div>
  );
} 