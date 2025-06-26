import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, addMonths, subMonths, isSameDay, parseISO, isSameMonth, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Repeat, MapPin, Clock, Users, ArrowRight, List, Grid } from 'lucide-react';
import { EventModal } from '@/components/EventModal';
import { useAuth } from '@/contexts/AuthContext';
import SEO from '@/components/SEO';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
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
        .slice(0, isMobile ? 8 : 5); // Show more events on mobile
      
      setUpcomingEvents(upcoming);
      setLoading(false);
    });
    
    return unsubscribe;
  }, [isMobile]);
  
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
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen bg-background bg-grid-pattern ${isMobile ? 'p-4' : 'p-6'}`}>
      <SEO 
        title="Events Calendar"
        description="View all upcoming events, including recurring events"
      />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <h1 className={`font-bold mb-2 text-foreground ${isMobile ? 'text-2xl' : 'text-4xl'}`}>
            Events Calendar
          </h1>
          <p className={`text-muted-foreground mx-auto ${isMobile ? 'text-sm max-w-sm' : 'max-w-2xl'}`}>
            View all upcoming events, including recurring events
          </p>
        </div>
        
        {/* Mobile View Mode Toggle */}
        {isMobile && (
          <div className="flex items-center justify-center mb-6">
            <div className="flex bg-secondary/30 rounded-lg p-1">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                className={`flex items-center gap-2 transition-all duration-200 ${
                  viewMode === 'calendar' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'hover:bg-secondary/50'
                }`}
                onClick={() => setViewMode('calendar')}
              >
                <Grid className="h-4 w-4" />
                Calendar
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className={`flex items-center gap-2 transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'hover:bg-secondary/50'
                }`}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
                List
              </Button>
            </div>
          </div>
        )}
        
        {/* Mobile List View */}
        {isMobile && viewMode === 'list' ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center mb-4">
              <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
              Upcoming Events
            </h2>
            
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <Card 
                  key={event.id}
                  className="overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-md group cursor-pointer active:scale-[0.98]"
                  onClick={() => handleSelectEvent(event)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-16 w-16 h-16 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex flex-col items-center justify-center text-center shadow-md">
                        <span className="text-xs font-bold text-primary uppercase tracking-wide leading-none">
                          {format(parseISO(event.date), 'MMM')}
                        </span>
                        <span className="text-lg font-bold text-foreground">
                          {format(parseISO(event.date), 'd')}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {event.isRecurring && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs h-5 px-2 rounded-md">
                              <Repeat className="h-3 w-3 mr-1" /> Recurring
                            </Badge>
                          )}
                          <Badge variant="outline" className={`${
                            event.mode === 'online' 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            } text-xs h-5 px-2 rounded-md`}>
                            {event.mode === 'online' ? 'Online' : 'In-Person'}
                          </Badge>
                        </div>
                        
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-2 leading-tight">
                          {event.name}
                        </h3>
                        
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-2 flex-shrink-0 text-primary/70" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-primary/70" />
                            <span className="truncate">{event.venue}</span>
                          </div>
                        </div>
                      </div>
                      
                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center p-8 bg-secondary/10 rounded-lg border border-border/30">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No upcoming events</p>
              </div>
            )}
          </div>
        ) : (
          /* Desktop Layout or Mobile Calendar View */
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} ${isMobile ? 'lg:gap-8' : 'lg:gap-8'}`}>
            {/* Upcoming Events - Only show on desktop or when not in mobile list view */}
            {!isMobile && (
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
                            <div className="min-w-16 w-16 h-16 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex flex-col items-center justify-center text-center shadow-md">
                              <span className="text-xs font-bold text-primary uppercase tracking-wide leading-none">
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
            )}
            
            {/* Calendar */}
            <div className={isMobile ? 'col-span-1' : 'lg:col-span-2'}>
              <Card className="backdrop-blur-sm bg-background/60 border border-border/30 shadow-sm">
                <div className={`flex items-center justify-between ${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
                  <h2 className={`font-medium flex items-center ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-full hover:bg-secondary/80 ${isMobile ? 'h-10 w-10' : 'h-8 w-8'}`}
                      onClick={handlePreviousMonth}
                    >
                      <ChevronLeft className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
                    </Button>
                    <Button
                      variant="outline"
                      className={`rounded-full ${isMobile ? 'h-10 py-2 px-4 text-sm' : 'h-8 py-1 px-3 text-sm'}`}
                      onClick={() => setCurrentMonth(new Date())}
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-full hover:bg-secondary/80 ${isMobile ? 'h-10 w-10' : 'h-8 w-8'}`}
                      onClick={handleNextMonth}
                    >
                      <ChevronRight className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
                    </Button>
                  </div>
                </div>
                
                <CardContent className={isMobile ? 'px-2 pb-4' : 'px-4 pb-6'}>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div 
                        key={day} 
                        className={`text-center font-medium text-muted-foreground ${
                          isMobile ? 'py-2 text-xs' : 'py-3 text-xs'
                        }`}
                      >
                        {isMobile ? day.charAt(0) : day}
                      </div>
                    ))}
                    
                    {/* Calendar days */}
                    {calendarDays.map((day, index) => {
                      const isToday = isSameDay(day.date, new Date());
                      const isPast = day.date < new Date() && !isToday;
                      
                      return (
                        <div 
                          key={index}
                          className={`border border-border/10 rounded-md p-1 transition-all ${
                            isMobile ? 'min-h-[80px]' : 'min-h-[100px]'
                          } ${
                            day.isCurrentMonth ? 'bg-secondary/5 hover:bg-secondary/10' : 'bg-secondary/5 opacity-40'
                          } ${isToday ? 'ring-1 ring-primary/40' : ''}`}
                        >
                          <div className="flex justify-between items-center mb-1 px-1">
                            <span className={`font-medium ${
                              isMobile ? 'text-xs' : 'text-xs'
                            } ${
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
                              <Badge variant="outline" className={`border-primary/30 rounded-sm ${
                                isMobile ? 'text-[8px] h-3 px-1 bg-primary/10 text-primary' : 'text-[9px] h-3 px-1 bg-primary/10 text-primary'
                              }`}>
                                {isMobile ? '•' : 'Today'}
                              </Badge>
                            )}
                          </div>
                          
                          <div className={`space-y-1 overflow-y-auto scrollbar-thin ${
                            isMobile ? 'max-h-[60px]' : 'max-h-[80px]'
                          }`}>
                            {day.events.map((event) => (
                              <div 
                                key={event.id}
                                onClick={() => handleSelectEvent(event)}
                                className={`
                                  p-1 rounded cursor-pointer truncate flex items-center gap-1 transition-all
                                  ${isMobile ? 'text-[9px] active:scale-95' : 'text-[10px]'}
                                  ${event.mode === 'online' 
                                    ? 'bg-blue-500/10 hover:bg-blue-500/20 border-l border-blue-500/50' 
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-l border-emerald-500/50'
                                  }
                                `}
                              >
                                {event.isRecurring || event.isRecurringChild ? (
                                  <Repeat className={`flex-shrink-0 text-amber-500 ${isMobile ? 'h-2 w-2' : 'h-2 w-2'}`} />
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
        )}
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