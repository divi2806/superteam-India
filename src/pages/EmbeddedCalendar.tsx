import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  description: string;
  venue: string;
  mode: 'online' | 'offline';
  date: string;
  time: string;
  imageURL?: string;
  createdBy: string;
  createdByName: string;
  communityId?: string;
  communityName?: string;
  communityImageURL?: string;
  isRecurring?: boolean;
  isRecurringChild?: boolean;
  pendingApproval?: boolean;
}

interface Community {
  name: string;
  imageURL: string;
}

const EmbeddedCalendar = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  useEffect(() => {
    if (!communityId) return;
    
    // Fetch community data and events
    const fetchData = async () => {
      try {
        // Get community info
        const communityDoc = await getDoc(doc(db, 'communities', communityId));
        if (communityDoc.exists()) {
          setCommunity({
            name: communityDoc.data().name,
            imageURL: communityDoc.data().imageURL
          });
        }
        
        // Get events for this community
        const eventsQuery = query(
          collection(db, 'events'),
          where('communityId', '==', communityId),
          where('pendingApproval', '!=', true)
        );
        
        const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
          const eventsData: Event[] = [];
          snapshot.forEach((doc) => {
            const eventData = doc.data() as Event;
            eventsData.push({
              id: doc.id,
              ...eventData
            });
          });
          
          setEvents(eventsData);
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [communityId]);
  
  // Group events by date
  const eventsByDate = useMemo(() => {
    const groupedEvents: Record<string, Event[]> = {};
    
    events.forEach(event => {
      if (!groupedEvents[event.date]) {
        groupedEvents[event.date] = [];
      }
      groupedEvents[event.date].push(event);
    });
    
    return groupedEvents;
  }, [events]);
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add days from previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = new Date(year, month, 1 - (firstDayOfWeek - i));
      days.push({
        date: day,
        isCurrentMonth: false,
        events: eventsByDate[format(day, 'yyyy-MM-dd')] || []
      });
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push({
        date: day,
        isCurrentMonth: true,
        events: eventsByDate[format(day, 'yyyy-MM-dd')] || []
      });
    }
    
    // Add days from next month
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const day = new Date(year, month + 1, i);
        days.push({
          date: day,
          isCurrentMonth: false,
          events: eventsByDate[format(day, 'yyyy-MM-dd')] || []
        });
      }
    }
    
    return days;
  }, [currentMonth, eventsByDate]);
  
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-full p-4 bg-background font-sans text-foreground">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/3">
          {community && (
            <div className="mb-4 flex items-center">
              <div className="w-8 h-8 rounded-lg overflow-hidden mr-2">
                <img 
                  src={community.imageURL} 
                  alt={community.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-lg font-semibold">{community.name}</h1>
              
              <a 
                href={`${window.location.origin}/community/${communityId}`}
                target="_blank"
                rel="noopener noreferrer" 
                className="text-sm text-primary flex items-center hover:underline ml-auto"
              >
                View Full Calendar <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4">
              <h2 className="text-md font-medium flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="h-7 py-1 px-2 text-xs"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="grid grid-cols-7 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground p-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`h-8 rounded flex items-center justify-center text-sm ${
                      day.isCurrentMonth 
                        ? day.events.length > 0 
                          ? 'bg-primary/10 text-primary font-medium hover:bg-primary/20 cursor-pointer' 
                          : 'hover:bg-background/50 cursor-pointer'
                        : 'text-muted-foreground/50'
                    } ${format(day.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
                      ? 'ring-1 ring-primary' 
                      : ''}`}
                    onClick={() => day.events.length > 0 && setSelectedEvent(day.events[0])}
                  >
                    {format(day.date, 'd')}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:w-2/3">
          <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
          
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <Card 
                  key={event.id} 
                  className="overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex flex-row items-center">
                    {event.imageURL ? (
                      <div className="w-16 h-16 flex-shrink-0">
                        <img 
                          src={event.imageURL}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 flex-shrink-0 bg-primary/10 flex items-center justify-center">
                        <CalendarIcon className="h-6 w-6 text-primary/40" />
                      </div>
                    )}
                    
                    <div className="p-3 flex-grow">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-sm">{event.name}</h3>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            <span>{event.date} at {event.time}</span>
                          </div>
                        </div>
                        
                        <Badge className="text-xs h-5 px-1.5">
                          {event.mode === 'online' ? 'Online' : 'In-Person'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-background/20 rounded-lg border border-border/30">
              <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </div>
          )}
        </div>
      </div>
      
      {selectedEvent && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-start">
              <h3 className="text-lg font-semibold">{selectedEvent.name}</h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {selectedEvent.imageURL && (
                <div className="mb-4 rounded-md overflow-hidden">
                  <img 
                    src={selectedEvent.imageURL}
                    alt={selectedEvent.name}
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Date & Time</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.date} at {selectedEvent.time}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Venue</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.venue}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.description}
                  </p>
                </div>
                
                <div className="flex justify-end pt-2">
                  <a
                    href={`${window.location.origin}/event/${selectedEvent.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white px-4 py-2 hover:bg-primary/90"
                  >
                    View Event Details
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddedCalendar; 