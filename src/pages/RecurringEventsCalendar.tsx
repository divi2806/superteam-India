import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, addMonths, subMonths, isSameDay, parseISO, isSameMonth, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Repeat, MapPin, Clock, Users, ArrowRight } from 'lucide-react';
import { EventModal } from '@/components/EventModal';
import { useAuth } from '@/contexts/AuthContext';
import SEO from '@/components/SEO';

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
  coordinates: [number, number];
  communityId?: string;
  communityName?: string;
  communityImageURL?: string;
  isRecurring?: boolean;
  isRecurringChild?: boolean;
  pendingApproval?: boolean;
  recurringOptions?: {
    parentEventId?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    dates?: string[];
    occurrenceNumber?: number;
  };
}

const RecurringEventsCalendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    // Get all events, including recurring events
    const eventsQuery = query(collection(db, 'events'));
    
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        const eventData = doc.data() as Event;
        // Only include events that are not pending approval
        if (!eventData.pendingApproval) {
          eventsData.push({
            id: doc.id,
            ...eventData
          });
        }
      });
      
      setEvents(eventsData);
      
      // Filter and sort upcoming events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcoming = eventsData
        .filter(event => {
          const eventDate = parseISO(`${event.date}T00:00:00`);
          return eventDate >= today;
        })
        .sort((a, b) => {
          return parseISO(`${a.date}T00:00:00`).getTime() - parseISO(`${b.date}T00:00:00`).getTime();
        })
        .slice(0, 5); // Get only 5 upcoming events
      
      setUpcomingEvents(upcoming);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
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

  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-6 bg-background bg-grid-pattern">
      <SEO 
        title="Events Calendar"
        description="View all upcoming events, including recurring events"
      />
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Events Calendar</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            View all upcoming events, including recurring events
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Events */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-medium flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                Upcoming Events
              </h2>
            </div>
            
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <Card 
                    key={event.id}
                    className="overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-md group cursor-pointer"
                    onClick={() => handleSelectEvent(event)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-14 w-14 h-14 rounded-lg flex flex-col items-center justify-center bg-secondary/30 text-center">
                          <span className="text-xs text-muted-foreground font-medium">
                            {format(parseISO(event.date), 'MMM')}
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            {format(parseISO(event.date), 'd')}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {event.isRecurring && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] h-4 px-1 rounded-sm">
                                <Repeat className="h-2.5 w-2.5 mr-1" /> Recurring
                              </Badge>
                            )}
                            <Badge variant="outline" className={`${
                              event.mode === 'online' 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              } text-[10px] h-4 px-1 rounded-sm`}>
                              {event.mode === 'online' ? 'Online' : 'In-Person'}
                            </Badge>
                          </div>
                          
                          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {event.name}
                          </h3>
                          
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span>{event.time}</span>
                            </div>
                            <div className="flex items-center truncate">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{event.venue}</span>
                            </div>
                          </div>
                        </div>
                        
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center p-8 bg-secondary/10 rounded-lg border border-border/30">
                  <p className="text-muted-foreground">No upcoming events</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="backdrop-blur-sm bg-background/60 border border-border/30 shadow-sm">
              <div className="flex items-center justify-between p-6 pb-4">
                <h2 className="text-xl font-medium flex items-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-secondary/80"
                    onClick={handlePreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 py-1 px-3 text-sm rounded-full"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-secondary/80"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <CardContent className="px-4 pb-6">
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div 
                      key={day} 
                      className="text-center py-3 text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    const isToday = isSameDay(day.date, new Date());
                    const isPast = day.date < new Date() && !isToday;
                    
                    return (
                      <div 
                        key={index}
                        className={`min-h-[100px] border border-border/10 rounded-md p-1 transition-all ${
                          day.isCurrentMonth ? 'bg-secondary/5 hover:bg-secondary/10' : 'bg-secondary/5 opacity-40'
                        } ${isToday ? 'ring-1 ring-primary/40' : ''}`}
                      >
                        <div className="flex justify-between items-center mb-1 px-1">
                          <span className={`text-xs font-medium ${
                            isToday 
                              ? 'text-primary' 
                              : isPast
                                ? 'text-muted-foreground/70'
                                : day.isCurrentMonth 
                                  ? 'text-foreground' 
                                  : 'text-muted-foreground/50'
                          }`}>
                            {format(day.date, 'd')}
                          </span>
                          
                          {isToday && (
                            <Badge variant="outline" className="text-[9px] h-3 px-1 bg-primary/10 text-primary border-primary/30 rounded-sm">
                              Today
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-thin">
                          {day.events.map((event) => (
                            <div 
                              key={event.id}
                              onClick={() => handleSelectEvent(event)}
                              className={`
                                text-[10px] p-1 rounded cursor-pointer truncate flex items-center gap-1 transition-all
                                ${event.mode === 'online' 
                                  ? 'bg-blue-500/10 hover:bg-blue-500/20 border-l border-blue-500/50' 
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-l border-emerald-500/50'
                                }
                              `}
                            >
                              {event.isRecurring || event.isRecurringChild ? (
                                <Repeat className="h-2 w-2 flex-shrink-0 text-amber-500" />
                              ) : null}
                              <span className="truncate">{event.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Event Modal */}
      <EventModal 
        event={selectedEvent} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </div>
  );
};

export default RecurringEventsCalendar; 