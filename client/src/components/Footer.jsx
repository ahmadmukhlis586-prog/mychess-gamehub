import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-purple-900/30 bg-brand-card/50 mt-20 py-8 relative z-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
        <div>
          <p className="font-semibold text-gray-200">MYCHESS GAMEHUB - Kelantan Community Club</p>
          <p>Located below PowerShare at Nasi Ayam Warisan store, Kota Bharu.</p>
        </div>
        <p>© {currentYear} MyChess. Modern Chess Platform for Kelantan.</p>
      </div>
    </footer>
  );
};

export default Footer;