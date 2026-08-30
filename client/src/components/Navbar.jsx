import React from 'react';
import { Link } from 'react-router-dom'; // or your routing library

const Navbar = ({ isLoggedIn, isAdmin, cartCount }) => {
  return (
    <nav className="border-b border-purple-900/40 bg-brand-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <span className="bg-gradient-to-r from-brand-vivid to-purple-400 bg-clip-text text-transparent">
            MYCHESS
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-brand-purple/40 text-brand-vivid border border-brand-vivid/30 font-semibold">
            GAMEHUB
          </span>
        </Link>
        
        <div className="flex items-center gap-6 z-10">
          <Link to="/" className="hover:text-brand-vivid transition">Home</Link>
          <Link to="/merchandise" className="hover:text-brand-vivid transition flex items-center gap-1.5 font-medium text-purple-300">
            Merchandise
          </Link>
          
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="hover:text-brand-vivid transition">Dashboard</Link>
              <Link to="/payment" className="hover:text-brand-vivid transition">Payments</Link>
              {isAdmin && (
                <Link to="/admin" className="text-amber-400 hover:text-amber-300 font-semibold">
                  Admin Panel
                </Link>
              )}
              <Link to="/logout" className="px-4 py-2 text-sm bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 rounded-lg transition">
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-brand-vivid transition">Login</Link>
              <Link to="/register" className="px-5 py-2.5 bg-gradient-to-r from-brand-purple to-brand-vivid hover:opacity-90 rounded-xl font-bold transition shadow-lg shadow-brand-purple/30">
                Join Community
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;