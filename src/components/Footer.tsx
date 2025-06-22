import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Github, Heart } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border/20 py-6 bg-background/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="https://i.ibb.co/9mdV4RNZ/o-Fqnid5-X-400x400.jpg" alt="Superteam India Logo" className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold text-foreground">Superteam India Events</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors duration-200">Home</Link>
            <Link to="/community" className="hover:text-primary transition-colors duration-200">Communities</Link>
            <Link to="/create-event" className="hover:text-primary transition-colors duration-200">Create Event</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors duration-200 flex items-center gap-1">
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
          
          <div className="mt-4 md:mt-0 text-xs text-muted-foreground flex items-center">
            <span>© {currentYear} Superteam India Events. Made with</span>
            <Heart className="h-3 w-3 mx-1 text-red-500 animate-pulse" />
            <span>in India</span>
          </div>
        </div>
        
        {/* Hidden SEO optimized content */}
        <div className="sr-only">
          <h2>EventsIndia - Find and Create Events Across India</h2>
          <p>
            Discover community events, tech meetups, workshops and conferences across India. 
            Create, manage and join events in your area. Connect with like-minded individuals and communities.
          </p>
          <ul>
            <li>Create and host events</li>
            <li>Join communities</li>
            <li>Discover events near you</li>
            <li>Manage event registrations</li>
            <li>Connect with event organizers</li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 