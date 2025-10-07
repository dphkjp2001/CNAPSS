// frontend/src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="border-t mt-12 py-6 text-center text-sm text-gray-400">
      <div className="flex justify-center gap-6">
        <Link to="/about" className="hover:underline">
          About
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
