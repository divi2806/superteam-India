import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IndiaMap from '@/components/IndiaMap';
import { Calendar, Users, MapPin, Star, Clock } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EventModal } from '@/components/EventModal';
import { toast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';
import { useIsMobile } from '@/hooks/use-mobile';

const Home = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // If an eventId is provided in the URL, fetch and display that event
    if (eventId) {
      const fetchEvent = async () => {
        try {
          const eventDoc = await getDoc(doc(db, 'events', eventId));
          if (eventDoc.exists()) {
            const eventData = { id: eventId, ...eventDoc.data() };
            setEvent(eventData);
            setIsModalOpen(true);
          } else {
            toast({
              title: "Event not found",
              description: "The event you're looking for doesn't exist or has been removed.",
              variant: "destructive",
            });
            navigate('/');
          }
        } catch (error) {
          console.error('Error fetching event:', error);
          toast({
            title: "Error",
            description: "Failed to load event details. Please try again.",
            variant: "destructive",
          });
          navigate('/');
        }
      };
      
      fetchEvent();
    }
  }, [eventId, navigate]);
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // If we came directly to this event from a URL, go back to home
    if (eventId) {
      navigate('/');
    }
  };
  
  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <SEO 
        title="Superteam India Events - Events Platform for India"
        description="Find and join events across India - tech meetups, workshops, conferences and community gatherings on our interactive map."
        keywords="events India, tech events, community events, Indian meetups, workshops India, event platform"
        type="website"
        schemaData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "headline": "Superteam India Events - Discover Events Across India",
          "description": "Find and join events across India - tech meetups, workshops, conferences and community gatherings on our interactive map.",
          "image": "https://superteam.in/og-image.jpg",
          "publisher": {
            "@type": "Organization",
            "name": "Superteam India Events",
            "logo": {
              "@type": "ImageObject",
              "url": "https://superteam.in/logo.png"
            }
          },
          "mainEntity": {
            "@type": "ItemList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Tech Meetups",
                "url": "https://superteam.in/events/tech"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Workshops",
                "url": "https://superteam.in/events/workshops"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": "Conferences",
                "url": "https://superteam.in/events/conferences"
              }
            ]
          }
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-10 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
            Welcome to
            <span className="block text-transparent bg-gradient-to-r from-primary to-primary/80 bg-clip-text">
              Superteam India Events
            </span>
          </h1>
          <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed text-sm sm:text-base px-2">
            Connect with like-minded people, discover exciting events, and create memorable experiences across the beautiful landscapes of India.
          </p>
        </div>

        {isMobile ? (
          // Mobile Layout - Stacked
          <div className="space-y-6 animate-slide-up">
            {/* Main Map */}
            <div className="glass-dark rounded-lg p-3 sm:p-5 h-[500px]">
              <div className="flex items-center justify-between mb-3 sm:mb-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">Offline Events Map</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">Discover in-person events across India</p>
                </div>
              </div>
              <div className="h-[410px] rounded-lg overflow-hidden">
                <IndiaMap />
              </div>
            </div>

            {/* How it Works */}
            <div className="glass-dark rounded-lg p-4 sm:p-5">
              <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-violet-400/10 rounded-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">How it Works</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { step: '1', text: 'Explore events on the interactive map' },
                  { step: '2', text: 'Click markers to view event details' },
                  { step: '3', text: 'Register with a simple form' },
                  { step: '4', text: 'Get approved by organizers' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start space-x-2 sm:space-x-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      {item.step}
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground leading-tight">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Features and About Us in a grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Key Features */}
              <div className="glass-dark rounded-lg p-4 sm:p-5">
                <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                  <div className="p-1.5 sm:p-2 bg-emerald-400/10 rounded-lg">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground">Key Features</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-2 rounded-md bg-secondary/50">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary"></div>
                    <span className="text-xs sm:text-sm text-muted-foreground">Interactive event map</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-md bg-secondary/50">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400"></div>
                    <span className="text-xs sm:text-sm text-muted-foreground">Community-driven events</span>
                  </div>
                </div>
              </div>

              {/* About Us */}
              <div className="glass-dark rounded-lg p-4 sm:p-5">
                <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground">About Us</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Superteam India Events connects communities across India through meaningful gatherings and experiences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Desktop Layout - Grid
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Main Map */}
            <div className="lg:col-span-3 animate-slide-up">
              <div className="glass-dark rounded-lg p-5 h-[650px]">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Offline Events Map</h2>
                    <p className="text-muted-foreground text-sm mt-1">Discover in-person events across India</p>
                  </div>
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-primary shadow-soft"></div>
                      <span className="text-muted-foreground">Active Events</span>
                    </div>
                  </div>
                </div>
                <div className="h-[560px] rounded-lg overflow-hidden">
                  <IndiaMap />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5 animate-slide-up" style={{animationDelay: '0.2s'}}>
              {/* How it Works */}
              <div className="glass-dark rounded-lg p-5">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-violet-400/10 rounded-lg">
                    <Clock className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">How it Works</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { step: '1', text: 'Explore events on the interactive map' },
                    { step: '2', text: 'Click markers to view event details' },
                    { step: '3', text: 'Register with a simple form' },
                    { step: '4', text: 'Get approved by organizers' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {item.step}
                      </div>
                      <span className="text-sm text-muted-foreground leading-tight">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* About Us */}
              <div className="glass-dark rounded-lg p-5">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">About Us</h3>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Superteam India Events is a platform dedicated to connecting communities across India through meaningful gatherings and experiences.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Our mission is to foster collaboration, knowledge sharing, and community building throughout the diverse regions of India.
                  </p>
                </div>
              </div>

              {/* Key Features */}
              <div className="glass-dark rounded-lg p-5">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-emerald-400/10 rounded-lg">
                    <Star className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Key Features</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-2.5 rounded-md bg-secondary/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                    <span className="text-sm text-muted-foreground">Interactive event map</span>
                  </div>
                  <div className="flex items-center space-x-3 p-2.5 rounded-md bg-secondary/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                    <span className="text-sm text-muted-foreground">Community-driven events</span>
                  </div>
                  <div className="flex items-center space-x-3 p-2.5 rounded-md bg-secondary/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                    <span className="text-sm text-muted-foreground">QR code ticketing system</span>
                  </div>
                  <div className="flex items-center space-x-3 p-2.5 rounded-md bg-secondary/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <span className="text-sm text-muted-foreground">Recurring event scheduling</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {event && (
          <EventModal
            event={event}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
