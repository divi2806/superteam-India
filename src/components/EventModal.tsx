import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, ExternalLink, Loader2, CheckCircle, Users, ThumbsUp, ThumbsDown, XCircle, Repeat, ChevronLeft, ChevronRight, Lock, Video, Link as LinkIcon, Linkedin, Twitter, Globe, UserCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { doc, updateDoc, arrayUnion, getDoc, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import QRVerification from '@/components/QRVerification';
import SEO from '@/components/SEO';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

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
  coordinates: [number, number];
  communityId?: string;
  communityName?: string;
  communityImageURL?: string;
  requireApproval?: boolean;
  isFull?: boolean;
  imageURL?: string;
  isRecurring?: boolean;
  isRecurringChild?: boolean;
  pendingApproval?: boolean;
  recurringOptions?: {
    parentEventId?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    dates?: string[];
    occurrenceNumber?: number;
  };
  registrations?: { 
    userId: string; 
    name: string; 
    email: string; 
    reason: string; 
    date: string;
    status: 'pending' | 'approved' | 'rejected' 
  }[];
  pendingRegistrations?: { 
    userId: string; 
    name: string; 
    email: string; 
    reason: string; 
    date: string;
  }[];
}

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [organizer, setOrganizer] = useState<any>(null);
  const [showOrganizerProfile, setShowOrganizerProfile] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [recurringEvents, setRecurringEvents] = useState<Event[]>([]);
  const [currentOccurrenceIndex, setCurrentOccurrenceIndex] = useState(0);
  const [loadingRecurringEvents, setLoadingRecurringEvents] = useState(false);

  useEffect(() => {
    if (event && user) {
      // Check if user is already registered
      const existingRegistration = event.registrations?.find(reg => reg.userId === user.uid);
      if (existingRegistration) {
        setHasRegistered(true);
        setRegistrationStatus(existingRegistration.status);
      } else {
        // Check if user has a pending registration
        const pendingRegistration = event.pendingRegistrations?.find(reg => reg.userId === user.uid);
        if (pendingRegistration) {
          setHasRegistered(true);
          setRegistrationStatus('pending');
        } else {
          setHasRegistered(false);
          setRegistrationStatus(null);
        }
      }

      // Fill form with user data if available
      setFormData({
        name: user.displayName || '',
        email: user.email || '',
        reason: '',
      });

      // Fetch organizer info
      const fetchOrganizer = async () => {
        try {
          const organizerDoc = await getDoc(doc(db, 'users', event.createdBy));
          if (organizerDoc.exists()) {
            setOrganizer(organizerDoc.data());
          }
        } catch (error) {
          console.error('Error fetching organizer:', error);
        }
      };

      fetchOrganizer();
      
      // Fetch recurring events if this is a recurring event
      if ((event.isRecurring || event.isRecurringChild) && event.recurringOptions) {
        fetchRecurringEvents(event);
      } else {
        setRecurringEvents([]);
      }
    }
  }, [event, user]);

  const fetchRecurringEvents = async (currentEvent: Event) => {
    setLoadingRecurringEvents(true);
    try {
      let parentId = currentEvent.isRecurringChild 
        ? currentEvent.recurringOptions?.parentEventId 
        : currentEvent.id;
      
      if (!parentId) return;
      
      // Get the parent event first
      const parentEventDoc = await getDoc(doc(db, 'events', parentId));
      if (!parentEventDoc.exists()) return;
      
      const parentEvent = { id: parentId, ...parentEventDoc.data() } as Event;
      
      // Get all child events
      const childEventsQuery = query(
        collection(db, 'events'),
        where('recurringOptions.parentEventId', '==', parentId),
        where('isRecurringChild', '==', true)
      );
      
      const childEventsSnapshot = await getDocs(childEventsQuery);
      const childEvents: Event[] = [];
      
      childEventsSnapshot.forEach((doc) => {
        childEvents.push({ id: doc.id, ...doc.data() } as Event);
      });
      
      // Combine and sort all events by date
      const allEvents = [parentEvent, ...childEvents].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      setRecurringEvents(allEvents);
      
      // Find the index of the current event
      const currentIndex = allEvents.findIndex(e => e.id === currentEvent.id);
      if (currentIndex !== -1) {
        setCurrentOccurrenceIndex(currentIndex);
      }
    } catch (error) {
      console.error('Error fetching recurring events:', error);
    } finally {
      setLoadingRecurringEvents(false);
    }
  };

  const navigateToOccurrence = (index: number) => {
    if (index >= 0 && index < recurringEvents.length) {
      setCurrentOccurrenceIndex(index);
      // We don't need to close and reopen the modal, just update the current event
      // The parent component doesn't need to know about this internal navigation
    }
  };

  // Get the current event to display (either the original event or a recurring occurrence)
  const currentEvent = recurringEvents.length > 0 ? recurringEvents[currentOccurrenceIndex] : event;

  if (!currentEvent) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async () => {
    if (!user || !currentEvent) return;

    setSubmitting(true);
    try {
      // Validate form
      if (!formData.name.trim() || !formData.email.trim() || !formData.reason.trim()) {
        toast({
          title: 'Missing information',
          description: 'Please fill out all the fields.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const registrationData = {
        userId: user.uid,
        name: formData.name,
        email: formData.email,
        reason: formData.reason,
        date: new Date().toISOString(),
      };

      if (currentEvent.requireApproval) {
        // Add to pending registrations
        await updateDoc(doc(db, 'events', currentEvent.id), {
          pendingRegistrations: arrayUnion(registrationData),
        });

        toast({
          title: 'Registration submitted',
          description: 'Your registration is pending approval from the event organizer.',
        });
      } else {
        // Add directly to approved registrations
        await updateDoc(doc(db, 'events', currentEvent.id), {
          registrations: arrayUnion({
            ...registrationData,
            status: 'approved',
          }),
        });

        toast({
          title: 'Registration successful',
          description: 'You have successfully registered for this event.',
        });
      }

      setHasRegistered(true);
      setRegistrationStatus('pending');
      setIsRegistering(false);
    } catch (error) {
      console.error('Error registering for event:', error);
      toast({
        title: 'Registration failed',
        description: 'There was a problem submitting your registration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!currentEvent) return;
    
    setApproving(true);
    try {
      // Find the pending registration
      const pendingReg = currentEvent.pendingRegistrations?.find(reg => reg.userId === userId);
      if (!pendingReg) return;
      
      // Get current event data for notifications
      const eventDoc = await getDoc(doc(db, 'events', currentEvent.id));
      const eventData = eventDoc.exists() ? eventDoc.data() : null;
      const notifications = eventData?.notifications || [];
      
      // Add approval notification
      notifications.push({
        type: 'registration_approved',
        message: `Your registration for ${currentEvent.name} has been approved! You're all set to attend the event.`,
        timestamp: new Date(),
        readBy: []
      });
      
      // Add to approved registrations
      await updateDoc(doc(db, 'events', currentEvent.id), {
        registrations: arrayUnion({
          ...pendingReg,
          status: 'approved',
        }),
        pendingRegistrations: arrayRemove(pendingReg),
        notifications: notifications,
        hasNotifications: true
      });
      
      toast({
        title: 'Registration approved',
        description: 'The participant has been approved and notified.',
      });
      
      // Refresh the event data
      onClose(); // Close and reopen to refresh data
    } catch (error) {
      console.error('Error approving registration:', error);
      toast({
        title: 'Approval failed',
        description: 'There was a problem approving this registration.',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };
  
  const handleReject = async (userId: string) => {
    if (!currentEvent) return;
    
    setApproving(true);
    try {
      // Find the pending registration
      const pendingReg = currentEvent.pendingRegistrations?.find(reg => reg.userId === userId);
      if (!pendingReg) return;
      
      // Add to rejected registrations
      await updateDoc(doc(db, 'events', currentEvent.id), {
        registrations: arrayUnion({
          ...pendingReg,
          status: 'rejected',
        }),
        pendingRegistrations: arrayRemove(pendingReg),
      });
      
      toast({
        title: 'Registration rejected',
        description: 'The participant has been rejected and notified.',
      });
      
      // Refresh the event data
      onClose(); // Close and reopen to refresh data
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toast({
        title: 'Rejection failed',
        description: 'There was a problem rejecting this registration.',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!user || !currentEvent) return;
    
    setCancelling(true);
    try {
      // Find the current user's registration
      let userRegistration;
      let registrationField;
      
      // Check if it's in approved registrations
      if (registrationStatus === 'approved' || registrationStatus === 'rejected') {
        userRegistration = currentEvent.registrations?.find(reg => reg.userId === user.uid);
        registrationField = 'registrations';
      } else {
        // It's in pending registrations
        userRegistration = currentEvent.pendingRegistrations?.find(reg => reg.userId === user.uid);
        registrationField = 'pendingRegistrations';
      }
      
      if (!userRegistration) {
        throw new Error('Registration not found');
      }
      
      // Remove the registration from the appropriate collection
      await updateDoc(doc(db, 'events', currentEvent.id), {
        [registrationField]: arrayRemove(userRegistration)
      });
      
      toast({
        title: 'Registration cancelled',
        description: 'Your registration has been successfully cancelled.',
      });
      
      setHasRegistered(false);
      setRegistrationStatus(null);
      onClose(); // Close modal to refresh data
    } catch (error) {
      console.error('Error cancelling registration:', error);
      toast({
        title: 'Cancellation failed',
        description: 'There was a problem cancelling your registration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const isOrganizer = user?.uid === currentEvent.createdBy;
  const pendingCount = currentEvent.pendingRegistrations?.length || 0;
  const approvedCount = currentEvent.registrations?.filter(r => r.status === 'approved').length || 0;
  const isRecurringEvent = currentEvent.isRecurring || currentEvent.isRecurringChild;
  const totalOccurrences = recurringEvents.length;
  
  // Format the recurring frequency for display
  const getRecurringFrequencyText = () => {
    if (!currentEvent.recurringOptions?.frequency) return '';
    
    switch (currentEvent.recurringOptions.frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return '';
    }
  };

  // Check if the user can access the meeting link
  const canAccessMeetingLink = isOrganizer || (hasRegistered && registrationStatus === 'approved');
  
  // Function to format meeting link for display
  const formatMeetingLink = (link: string) => {
    try {
      const url = new URL(link);
      return url.hostname;
    } catch (e) {
      return link;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        {/* SEO for individual event */}
        {currentEvent && (
          <SEO
            title={currentEvent.name}
            description={`Join ${currentEvent.name} at ${currentEvent.venue} on ${currentEvent.date} at ${currentEvent.time}. ${currentEvent.description.substring(0, 120)}...`}
            type="event"
            schemaData={{
              "@context": "https://schema.org",
              "@type": "Event",
              "name": currentEvent.name,
              "description": currentEvent.description,
              "startDate": `${currentEvent.date}T${currentEvent.time}`,
              "location": {
                "@type": currentEvent.mode === 'online' ? "VirtualLocation" : "Place",
                "name": currentEvent.venue,
                ...(currentEvent.mode === 'offline' && currentEvent.coordinates && {
                  "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": currentEvent.coordinates[0],
                    "longitude": currentEvent.coordinates[1]
                  }
                })
              },
              "organizer": {
                "@type": "Person",
                "name": currentEvent.createdByName
              },
              "eventStatus": currentEvent.isFull ? "EventMovedOnline" : "EventScheduled",
              "eventAttendanceMode": currentEvent.mode === 'online' ? "OnlineEventAttendanceMode" : "OfflineEventAttendanceMode"
            }}
          />
        )}
        <DialogContent 
          className="glass-dark border-border/30 max-w-xl max-h-[90vh] overflow-y-auto" 
          closeButtonClassName="absolute right-4 top-4 rounded-full h-8 w-8 flex items-center justify-center bg-secondary/50 opacity-100 ring-offset-0 hover:bg-secondary/80 transition-colors"
        >
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-1 pr-6">
                <DialogTitle className="text-2xl font-bold text-foreground">{currentEvent.name}</DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={currentEvent.mode === 'online' ? 'secondary' : 'outline'} className={currentEvent.mode === 'online' ? 'bg-primary/10 text-primary' : 'border-emerald-400/30 text-emerald-400'}>
                    {currentEvent.mode === 'online' ? 'Online' : 'In-Person'}
                  </Badge>
                  {currentEvent.communityName && (
                    <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/30">
                      {currentEvent.communityName}
                    </Badge>
                  )}
                  {isRecurringEvent && (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 flex items-center">
                      <Repeat className="h-3 w-3 mr-1" />
                      {getRecurringFrequencyText()}
                    </Badge>
                  )}
                  {currentEvent.isFull && (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse">
                      <Users className="h-3 w-3 mr-1" />
                      Full
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Recurring event navigation */}
            {isRecurringEvent && totalOccurrences > 0 && (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between bg-secondary/20 rounded-md p-2 border border-border/20">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigateToOccurrence(currentOccurrenceIndex - 1)}
                    disabled={currentOccurrenceIndex === 0 || loadingRecurringEvents}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {loadingRecurringEvents ? (
                        <span className="flex items-center">
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                          Loading occurrences...
                        </span>
                      ) : (
                        <>
                          Occurrence {currentOccurrenceIndex + 1} of {totalOccurrences}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(currentEvent.date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigateToOccurrence(currentOccurrenceIndex + 1)}
                    disabled={currentOccurrenceIndex === totalOccurrences - 1 || loadingRecurringEvents}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Event image if available */}
            {currentEvent.imageURL && (
              <div className="rounded-md overflow-hidden aspect-video border border-border/20">
                <img 
                  src={currentEvent.imageURL} 
                  alt={currentEvent.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Event details */}
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary/80" />
                <span>{currentEvent.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary/80" />
                <span>{currentEvent.time}</span>
              </div>
              
              {/* Meeting link for online events */}
              {currentEvent.mode === 'online' && (
                <div className="flex items-start gap-2">
                  <Video className="h-4 w-4 text-primary/80 mt-0.5" />
                  {canAccessMeetingLink ? (
                    <div className="flex flex-col">
                      <span className="flex items-center">
                        <span className="mr-2">Meeting Link:</span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1">
                          <LinkIcon className="h-3 w-3" />
                          {formatMeetingLink(currentEvent.venue)}
                        </Badge>
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Click the "Join Online Event" button below to access the meeting
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Lock className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                      <span>Meeting link will be available after your registration is approved</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Location for offline events */}
              {currentEvent.mode === 'offline' && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary/80" />
                  <span>{currentEvent.venue}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <User className="h-4 w-4 mr-1" />
                <span>Organized by {currentEvent.createdByName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 ml-1 hover:bg-background/50"
                  onClick={() => setShowOrganizerProfile(true)}
                >
                  <UserCircle className="h-4 w-4 mr-1" />
                  <span className="text-xs">View Profile</span>
                </Button>
              </div>
              {isOrganizer && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary/80" />
                  <div className="flex gap-2">
                    <span>{approvedCount} approved</span>
                    {pendingCount > 0 && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                        {pendingCount} pending
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Event description */}
            <div className="p-4 bg-secondary/20 rounded-lg border border-border/20">
              <p className="text-foreground whitespace-pre-line">
                {currentEvent.description}
              </p>
            </div>

            {/* Community info if available */}
            {currentEvent.communityId && currentEvent.communityImageURL && (
              <div className="border-t border-border/20 pt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Community Event</h3>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md overflow-hidden">
                    <img 
                      src={currentEvent.communityImageURL} 
                      alt={currentEvent.communityName} 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">{currentEvent.communityName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Community-hosted event</p>
                  </div>
                </div>
              </div>
            )}

            {/* Organizer info */}
            {organizer && (
              <div className="border-t border-border/20 pt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">About the organizer</h3>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={organizer.photoURL} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {organizer.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-foreground font-medium">{organizer.name}</p>
                    {organizer.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{organizer.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Registration status */}
            {hasRegistered && (
              <div className="border-t border-border/20 pt-4">
                <div className={`p-4 rounded-lg ${
                  registrationStatus === 'approved' 
                    ? 'bg-emerald-500/10 border border-emerald-500/20' 
                    : registrationStatus === 'rejected'
                    ? 'bg-destructive/10 border border-destructive/20'
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  <div className="flex items-center gap-3">
                    {registrationStatus === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : registrationStatus === 'rejected' ? (
                      <X className="h-5 w-5 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {registrationStatus === 'approved' 
                          ? 'Your registration has been approved!' 
                          : registrationStatus === 'rejected'
                          ? 'Your registration was not approved.'
                          : 'Your registration is pending approval.'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {registrationStatus === 'approved' 
                          ? 'You are confirmed for this event. We look forward to seeing you there!' 
                          : registrationStatus === 'rejected'
                          ? 'Unfortunately, the organizer has not approved your request to join.'
                          : 'The organizer will review your registration soon.'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Button to cancel registration */}
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelRegistration}
                      disabled={cancelling}
                      className="text-destructive border-destructive/20 hover:bg-destructive/10"
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 mr-2" />
                          Cancel Registration
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* QR Code for approved registrations */}
                  {registrationStatus === 'approved' && (
                    <div className="mt-4 flex flex-col items-center">
                      <p className="text-xs text-muted-foreground mb-2">Your event entry QR code:</p>
                      <QRVerification 
                        event={currentEvent}
                        user={user}
                        size={150}
                      />
                      <p className="text-xs text-muted-foreground mt-2">Show this at the event entrance</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Registrations Admin Section */}
            {isOrganizer && pendingCount > 0 && (
              <div className="border-t border-border/20 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-muted-foreground">Pending Approvals</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowRegistrations(!showRegistrations)}
                    className="text-xs h-8"
                  >
                    {showRegistrations ? 'Hide' : 'Show'} {pendingCount} pending
                  </Button>
                </div>
                
                {showRegistrations && (
                  <div className="mt-3 space-y-3">
                    {currentEvent.pendingRegistrations?.map((reg) => (
                      <div key={reg.userId} className="p-3 bg-secondary/30 rounded-lg border border-border/30">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium text-foreground">{reg.name}</p>
                            <p className="text-xs text-muted-foreground">{reg.email}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Reason: {reg.reason}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/30 bg-destructive/10"
                              onClick={() => handleReject(reg.userId)}
                              disabled={approving}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-500 border-emerald-500/20 hover:border-emerald-500/30 bg-emerald-500/10"
                              onClick={() => handleApprove(reg.userId)}
                              disabled={approving}
                            >
                              {approving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ThumbsUp className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Registration form */}
            {!hasRegistered && !isOrganizer ? (
              <div className="border-t border-border/20 pt-4">
                {currentEvent.isFull ? (
                  <div className="text-center py-6 px-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <Users className="h-10 w-10 text-amber-500/70 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Event is Full</h3>
                    <p className="text-muted-foreground">
                      This event has reached its capacity and is no longer accepting new registrations.
                    </p>
                  </div>
                ) : isRegistering ? (
                  <form className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Registration</h3>
                    <div className="space-y-2">
                      <Label htmlFor="name">Your name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className="bg-background/50 border-border/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        className="bg-background/50 border-border/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Why do you want to attend this event?</Label>
                      <Textarea
                        id="reason"
                        name="reason"
                        value={formData.reason}
                        onChange={handleInputChange}
                        placeholder="Briefly explain why you're interested in attending..."
                        className="bg-background/50 border-border/50"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsRegistering(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleRegister}
                        disabled={submitting}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Register'
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <h3 className="text-lg font-medium text-foreground mb-2">Interested in this event?</h3>
                    <p className="text-muted-foreground mb-4">Register to secure your spot at this event.</p>
                    <Button 
                      onClick={() => setIsRegistering(true)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Register for Event
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Location map (for offline events) */}
            {currentEvent.mode === 'offline' && (
              <div className="border-t border-border/20 pt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Location</h3>
                <div className="aspect-video rounded-md overflow-hidden bg-muted">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+7A49FF(${currentEvent.coordinates[0]},${currentEvent.coordinates[1]})/${currentEvent.coordinates[0]},${currentEvent.coordinates[1]},14,0/600x400?access_token=pk.eyJ1IjoiZGl2eWFuc2gyODI0IiwiYSI6ImNtYm1rcHQyNDFleXcya29oeTl6bnJ3NWYifQ.-ESnoL4cAb0Bh6xXwfpsBw`}
                  ></iframe>
                </div>
              </div>
            )}

            {/* Registration status with meeting link for approved users */}
            {hasRegistered && currentEvent.mode === 'online' && registrationStatus === 'approved' && (
              <div className="border-t border-border/20 pt-4">
                <Alert className="bg-emerald-500/10 border-emerald-500/20">
                  <Video className="h-4 w-4 text-emerald-500" />
                  <AlertTitle className="text-emerald-500">Meeting Access Granted</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    Your registration has been approved. You can join the online meeting using the link below.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            {currentEvent.mode === 'online' && canAccessMeetingLink && (
              <Button
                className="w-full bg-primary hover:bg-primary/90 gap-2"
                onClick={() => window.open(currentEvent.venue, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Join Online Event
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* User Profile Dialog */}
      {currentEvent && (
        <UserProfileDialog 
          userId={currentEvent.createdBy}
          isOpen={showOrganizerProfile}
          onClose={() => setShowOrganizerProfile(false)}
        />
      )}
    </>
  );
};

// User Profile Dialog Component
interface UserProfileDialogProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ userId, isOpen, onClose }) => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || !isOpen) return;
      
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : userData ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 border-2 border-primary/20">
                <AvatarImage src={userData.photoURL} alt={userData.name || userData.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {(userData.name || userData.displayName || '?').charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="mt-4 text-xl font-semibold text-foreground">{userData.name || userData.displayName}</h2>
              <p className="text-muted-foreground">{userData.email}</p>
              
              {userData.bio && (
                <p className="mt-4 text-sm text-muted-foreground">{userData.bio}</p>
              )}
            </div>
            
            {(userData.linkedinUrl || userData.twitterUrl || userData.personalUrl) && (
              <div className="flex justify-center space-x-4 pt-2">
                {userData.linkedinUrl && (
                  <a 
                    href={userData.linkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#0077b5] hover:text-[#0077b5]/80 transition-colors"
                  >
                    <Linkedin className="h-5 w-5" />
                    <span className="sr-only">LinkedIn</span>
                  </a>
                )}
                
                {userData.twitterUrl && (
                  <a 
                    href={userData.twitterUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#1DA1F2] hover:text-[#1DA1F2]/80 transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                    <span className="sr-only">Twitter/X</span>
                  </a>
                )}
                
                {userData.personalUrl && (
                  <a 
                    href={userData.personalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-500 hover:text-emerald-600 transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                    <span className="sr-only">Website</span>
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">User profile not found</p>
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
