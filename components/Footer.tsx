import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 shadow-md mt-auto py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-2 sm:mb-0">
            <span className="text-gray-600 dark:text-gray-300 text-sm">
              © {new Date().getFullYear()} FocusFlow. All rights reserved.
            </span>
          </div>
          <div className="flex space-x-4">
            <Link 
              href="/privacy-policy" 
              className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 text-sm"
            >
              Privacy Policy
            </Link>
            <Link 
              href="https://github.com/ankushthakur2007/Focus-Flow" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 text-sm"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
