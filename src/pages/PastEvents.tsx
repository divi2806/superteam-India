import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Filter, Search, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';

interface Event {
  id: string;
  name: string;
  venue: string;
  mode: 'online' | 'offline';
  description: string;
  date: string;
  time: string;
  createdBy: string;
  createdByName: string;
  isFull?: boolean;
  pendingApproval?: boolean;
}

const PastEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchPastEvents = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Get current date and format it as YYYY-MM-DD
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        
        // Query events with dates before today
        const eventsQuery = query(
          collection(db, 'events'),
          where('date', '<', formattedDate),
          orderBy('date', 'desc'),
          limit(50)
        );
        
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData: Event[] = [];
        
        eventsSnapshot.forEach((doc) => {
          const eventData = doc.data() as Event;
          // Only include events that are not pending approval
          if (!eventData.pendingApproval) {
            eventsData.push({ id: doc.id, ...eventData });
          }
        });
        
        setPastEvents(eventsData);
        setFilteredEvents(eventsData);
      } catch (error) {
        console.error('Error fetching past events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPastEvents();
  }, [user]);

  // Filter events when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEvents(pastEvents);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = pastEvents.filter(event => 
        event.name.toLowerCase().includes(lowercasedTerm) || 
        event.venue.toLowerCase().includes(lowercasedTerm) ||
        event.description.toLowerCase().includes(lowercasedTerm)
      );
      setFilteredEvents(filtered);
    }
  }, [searchTerm, pastEvents]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
        <Card className="glass-dark border-border/30 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Login Required</h2>
            <p className="text-muted-foreground mb-6">Please login to view past events.</p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-primary hover:bg-primary/90"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background bg-grid-pattern">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3 text-foreground">
            Past Events
          </h1>
          <p className="text-muted-foreground">
            Browse through completed events and experiences
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10 bg-secondary/30 border-border/30"
              placeholder="Search events by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading events...</span>
          </div>
        ) : (
          <>
            {filteredEvents.length > 0 ? (
              <div className="space-y-4">
                {filteredEvents.map(event => (
                  <Card key={event.id} className="glass-dark border-border/30 hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                          <h3 className="text-lg font-medium text-foreground mb-2">{event.name}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mb-3">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{event.date}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{event.time}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{event.venue}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={event.mode === 'online' ? 'secondary' : 'outline'} className={event.mode === 'online' ? 'bg-primary/10 text-primary' : 'border-emerald-400/30 text-emerald-400'}>
                            {event.mode === 'online' ? 'Online' : 'In-Person'}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            Organized by {event.createdByName || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-dark border-border/30">
                <CardContent className="py-16 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No past events found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm.trim() !== '' 
                      ? 'No events match your search criteria.' 
                      : 'There are no past events to display.'}
                  </p>
                  <Button onClick={() => navigate('/')}>
                    Explore Upcoming Events
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PastEvents; 