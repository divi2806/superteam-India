import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Check, X, User, Ticket, CalendarCheck, Share2, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeSVG } from 'qrcode.react';
import { EventManageOptions } from '@/components/EventManageOptions';
import QRVerification from '@/components/QRVerification';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  communityId?: string;
  communityName?: string;
  communityImageURL?: string;
  message?: string;
  coordinates?: [number, number];
  address?: string;
  isFull?: boolean;
  pendingApproval?: boolean;
  registrations?: {
    userId: string;
    name: string;
    email: string;
    reason: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
  }[];
  pendingRegistrations?: {
    userId: string;
    name: string;
    email: string;
    reason: string;
    date: string;
  }[];
}

interface MyRegistration {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventMode: 'online' | 'offline';
  status: 'pending' | 'approved' | 'rejected';
  organizerName: string;
  communityName?: string;
}

const MyEvents = () => {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Get user's created events
    const eventsQuery = query(
      collection(db, 'events'),
      where('createdBy', '==', user.uid)
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
      setMyEvents(eventsData);
      setLoading(false);
    });

    // Fetch events user has registered for
    const fetchRegisteredEvents = async () => {
      const allEventsQuery = query(collection(db, 'events'));
      
      const unsubscribeAllEvents = onSnapshot(allEventsQuery, (snapshot) => {
        const registrationsData: MyRegistration[] = [];
        
        snapshot.forEach((doc) => {
          const eventData = doc.data() as Event;
          
          // Check if user is in approved registrations
          const userRegistration = eventData.registrations?.find(reg => reg.userId === user.uid);
          
          // Check if user is in pending registrations
          const userPendingRegistration = eventData.pendingRegistrations?.find(reg => reg.userId === user.uid);
          
          if (userRegistration || userPendingRegistration) {
            registrationsData.push({
              eventId: doc.id,
              eventName: eventData.name,
              eventDate: eventData.date,
              eventTime: eventData.time,
              eventVenue: eventData.venue,
              eventMode: eventData.mode,
              status: userRegistration ? userRegistration.status : 'pending',
              organizerName: eventData.createdByName,
              communityName: eventData.communityName
            });
          }
        });
        
        setMyRegistrations(registrationsData);
      });
      
      return unsubscribeAllEvents;
    };

    const setupRegisteredEvents = async () => {
      const unsubscribeRegisteredEvents = await fetchRegisteredEvents();
      return unsubscribeRegisteredEvents;
    };

    let unsubscribeRegisteredEvents: (() => void) | undefined;
    setupRegisteredEvents().then(unsub => {
      unsubscribeRegisteredEvents = unsub;
    });

    return () => {
      unsubscribeEvents();
      if (unsubscribeRegisteredEvents) {
        unsubscribeRegisteredEvents();
      }
    };
  }, [user]);

  const getPendingCount = (event: Event) => {
    return event.pendingRegistrations?.length || 0;
  };

  const getApprovedCount = (event: Event) => {
    return event.registrations?.filter(r => r.status === 'approved').length || 0;
  };

  const generateShareableLink = (eventId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/event/${eventId}?ref=share`;
  };

  const handleCopyLink = (eventId: string) => {
    const link = generateShareableLink(eventId);
    navigator.clipboard.writeText(link);
    setCopiedEventId(eventId);
    
    toast({
      title: 'Link Copied!',
      description: 'Shareable event link has been copied to clipboard.',
    });
    
    setTimeout(() => {
      setCopiedEventId(null);
    }, 3000);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
        <Card className="glass-dark border-border/30 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Login Required</h2>
            <p className="text-muted-foreground">Please login to view your events.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-4 mx-auto"></div>
          <p className="text-muted-foreground">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background bg-grid-pattern">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            My Events
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your events and registrations
          </p>
        </div>

        <Tabs defaultValue="hosted" className="w-full">
          <TabsList className="mb-6 bg-secondary/50 p-1 rounded-lg">
            <TabsTrigger value="hosted" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <User className="w-4 h-4" />
              <span>Hosted Events</span>
            </TabsTrigger>
            <TabsTrigger value="registered" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Ticket className="w-4 h-4" />
              <span>Registered Events</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Hosted Events Tab */}
          <TabsContent value="hosted" className="space-y-4">
            {myEvents.length > 0 ? (
              myEvents.map((event) => {
                const pendingCount = getPendingCount(event);
                const approvedCount = getApprovedCount(event);

                return (
                  <Card key={event.id} className="glass-dark border-border/30 hover:border-primary/20 transition-all duration-200">
                    <CardHeader className="p-4 pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-foreground">{event.name}</CardTitle>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mt-1.5">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{event.date}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{event.time}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">{event.venue}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs py-1">
                              {approvedCount} Approved
                            </Badge>
                            {pendingCount > 0 && (
                              <Badge variant="outline" className="border-amber-400/50 text-amber-400 text-xs py-1">
                                {pendingCount} Pending
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className={`h-8 w-8 rounded-full border-border/50 ${copiedEventId === event.id ? 'bg-teal-500/20 text-teal-500 border-teal-500/30' : 'bg-secondary/50 hover:bg-secondary/70'}`}
                                    onClick={() => handleCopyLink(event.id)}
                                  >
                                    {copiedEventId === event.id ? (
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    ) : (
                                      <Share2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{copiedEventId === event.id ? 'Link copied!' : 'Share event link'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <EventManageOptions 
                              event={event}
                              onEventUpdated={() => {
                                toast({
                                  title: "Event updated",
                                  description: "The event details have been updated."
                                });
                              }}
                              onEventDeleted={() => {
                                toast({
                                  title: "Event deleted",
                                  description: "The event has been permanently removed."
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Status badges */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.communityName && (
                          <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/30 text-xs">
                            {event.communityName}
                          </Badge>
                        )}
                        {event.message && (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
                            Message for Participants
                          </Badge>
                        )}
                        {event.isFull && (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs">
                            Event Full
                          </Badge>
                        )}
                        {event.pendingApproval && event.communityId && (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 flex items-center gap-1 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            Pending Approval
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    {(pendingCount > 0 || approvedCount > 0) && (
                      <CardContent className="p-4 pt-0">
                        {/* Pending Registrations Section */}
                        {pendingCount > 0 && (
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-foreground flex items-center space-x-2 mb-2">
                              <Users className="w-4 h-4 text-amber-400" />
                              <span>Pending Registrations ({pendingCount})</span>
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {event.pendingRegistrations?.map((registration) => (
                                <div
                                  key={registration.userId}
                                  className="p-3 rounded-md bg-secondary/30 border border-border/20"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <h4 className="font-medium text-foreground text-sm">{registration.name}</h4>
                                        <Badge
                                          variant="secondary"
                                          className="bg-amber-400/10 text-amber-400 text-xs"
                                        >
                                          pending
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">{registration.email}</p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{registration.reason}</p>
                                    </div>
                                    
                                    <div className="flex space-x-1 ml-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 w-7 p-0 text-destructive border-destructive/20 bg-destructive/5"
                                        onClick={async () => {
                                          try {
                                            // Remove from pending registrations
                                            const pendingRegistrations = event.pendingRegistrations?.filter(
                                              reg => reg.userId !== registration.userId
                                            ) || [];
                                            
                                            // Add to registrations with rejected status
                                            const registrations = [
                                              ...(event.registrations || []),
                                              {
                                                ...registration,
                                                status: 'rejected'
                                              }
                                            ];
                                            
                                            await updateDoc(doc(db, 'events', event.id), {
                                              pendingRegistrations,
                                              registrations
                                            });
                                            
                                            toast({
                                              title: "Registration rejected",
                                              description: "The participant has been notified."
                                            });
                                          } catch (error) {
                                            console.error('Error rejecting registration:', error);
                                            toast({
                                              title: "Error",
                                              description: "Failed to reject registration.",
                                              variant: "destructive"
                                            });
                                          }
                                        }}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 w-7 p-0 bg-emerald-500 hover:bg-emerald-600"
                                        onClick={async () => {
                                          try {
                                            // Remove from pending registrations
                                            const pendingRegistrations = event.pendingRegistrations?.filter(
                                              reg => reg.userId !== registration.userId
                                            ) || [];
                                            
                                            // Add to registrations with approved status
                                            const registrations = [
                                              ...(event.registrations || []),
                                              {
                                                ...registration,
                                                status: 'approved'
                                              }
                                            ];
                                            
                                            // Create a notification for the user that they've been approved
                                            const eventData = await getDoc(doc(db, 'events', event.id));
                                            const currentData = eventData.exists() ? eventData.data() : null;
                                            const notifications = currentData?.notifications || [];
                                            
                                            // Add approval notification
                                            notifications.push({
                                              type: 'registration_approved',
                                              message: `Your registration for ${event.name} has been approved! You're all set to attend the event.`,
                                              timestamp: new Date(),
                                              readBy: []
                                            });
                                            
                                            await updateDoc(doc(db, 'events', event.id), {
                                              pendingRegistrations,
                                              registrations,
                                              notifications,
                                              hasNotifications: true
                                            });
                                            
                                            toast({
                                              title: "Registration approved",
                                              description: "The participant has been notified."
                                            });
                                          } catch (error) {
                                            console.error('Error approving registration:', error);
                                            toast({
                                              title: "Error",
                                              description: "Failed to approve registration.",
                                              variant: "destructive"
                                            });
                                          }
                                        }}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Approved Registrations Section */}
                        {approvedCount > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-foreground flex items-center space-x-2 mb-2">
                              <Users className="w-4 h-4 text-emerald-500" />
                              <span>Approved Registrations ({approvedCount})</span>
                            </h3>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {event.registrations?.filter(r => r.status === 'approved').map((registration) => (
                                <div
                                  key={registration.userId}
                                  className="p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="bg-emerald-500/20 text-emerald-500 text-xs">
                                        {registration.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground text-xs truncate">{registration.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{registration.email}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12 bg-secondary/10 rounded-lg border border-border/20">
                <User className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No events created yet</h3>
                <p className="text-muted-foreground mb-6">Create your first event to get started</p>
                <Button 
                  onClick={() => window.location.href = '/create-event'}
                  className="bg-primary hover:bg-primary/90"
                >
                  Create an Event
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* Registered Events Tab */}
          <TabsContent value="registered" className="space-y-4">
            {myRegistrations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRegistrations.map((reg) => (
                  <Card key={reg.eventId} className={`glass-dark border-border/30 overflow-hidden hover:shadow-md transition-all duration-200 ${
                    reg.status === 'approved' 
                      ? 'border-emerald-500/30' 
                      : reg.status === 'rejected'
                      ? 'border-destructive/30'
                      : 'border-amber-400/30'
                  }`}>
                    <div className={`h-1.5 ${
                      reg.status === 'approved' 
                        ? 'bg-emerald-500' 
                        : reg.status === 'rejected'
                        ? 'bg-destructive'
                        : 'bg-amber-400'
                    }`}></div>
                    <CardHeader className="p-4 pb-2">
                      <div>
                        <CardTitle className="text-base text-foreground mb-1 line-clamp-1">{reg.eventName}</CardTitle>
                        <div className="flex items-center gap-x-2 text-xs">
                          <Badge variant={
                            reg.status === 'approved' 
                              ? 'secondary' 
                              : reg.status === 'rejected'
                              ? 'destructive'
                              : 'outline'
                          } className={`text-xs py-0 px-1.5 ${
                            reg.status === 'approved' 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : reg.status === 'rejected'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-amber-400/10 text-amber-400'
                          }`}>
                            {reg.status === 'approved' 
                              ? 'Approved' 
                              : reg.status === 'rejected'
                              ? 'Rejected'
                              : 'Pending'}
                          </Badge>
                          {reg.communityName && (
                            <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/30 text-xs py-0 px-1.5">
                              {reg.communityName}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{reg.eventDate}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{reg.eventTime}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">{reg.eventVenue}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>By {reg.organizerName}</span>
                        </div>
                      </div>
                    </CardContent>
                    
                    {reg.status === 'approved' && (
                      <CardFooter className="p-4 pt-0 flex flex-col items-center">
                        <div className="bg-secondary/20 w-full rounded-md p-3 flex flex-col items-center">
                          <p className="text-xs text-muted-foreground mb-2">Event Entry QR Code</p>
                          <QRVerification 
                            event={{
                              id: reg.eventId,
                              name: reg.eventName,
                              date: reg.eventDate,
                              time: reg.eventTime,
                              venue: reg.eventVenue
                            }}
                            user={user}
                            size={100}
                          />
                        </div>
                        
                        <Button 
                          onClick={() => window.location.href = `/event/${reg.eventId}`}
                          className="mt-3 w-full bg-primary/10 hover:bg-primary/20 text-primary text-sm h-8"
                          variant="outline"
                        >
                          View Event Details
                        </Button>
                      </CardFooter>
                    )}
                    
                    {reg.status === 'pending' && (
                      <CardFooter className="p-4 pt-0">
                        <p className="text-xs text-muted-foreground">Your registration is being reviewed by the organizer.</p>
                      </CardFooter>
                    )}
                    
                    {reg.status === 'rejected' && (
                      <CardFooter className="p-4 pt-0">
                        <p className="text-xs text-destructive/80">Your registration has been declined by the organizer.</p>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-secondary/10 rounded-lg border border-border/20">
                <Ticket className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No registered events yet</h3>
                <p className="text-muted-foreground mb-6">Explore and register for events to see them here</p>
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="bg-primary hover:bg-primary/90"
                >
                  Explore Events
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyEvents;
