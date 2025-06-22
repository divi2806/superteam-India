import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';

const MOBILE_BREAKPOINT = 768;

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: any;
  eventId: string;
  eventName: string;
  communityId?: string;
  communityName?: string;
  communityImageURL?: string;
  read: boolean;
  actionable?: boolean;
}

const getReadClientNotificationIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem('readClientNotificationIds');
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error('Error reading from localStorage', error);
    return [];
  }
};

const addReadClientNotificationIds = (idsToAdd: string[]) => {
  if (typeof window === 'undefined' || idsToAdd.length === 0) return;
  try {
    const existingIds = getReadClientNotificationIds();
    const newIds = [...existingIds];
    idsToAdd.forEach(id => {
      if (!newIds.includes(id)) {
        newIds.push(id);
      }
    });
    localStorage.setItem('readClientNotificationIds', JSON.stringify(newIds));
  } catch (error) {
    console.error('Error writing to localStorage', error);
  }
};

// Notification content component shared between mobile and desktop
const NotificationContent = ({ 
  notifications, 
  markAsRead, 
  markAllAsRead,
  setOpen 
}: { 
  notifications: Notification[], 
  markAsRead: (id: string) => void, 
  markAllAsRead: () => void,
  setOpen: (open: boolean) => void
}) => {
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setOpen(false);
    navigate(`/event/${notification.eventId}`);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30">
        <h3 className="text-sm font-medium">Notifications</h3>
        {notifications.some(n => !n.read) && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 px-2 hover:bg-secondary/80"
            onClick={markAllAsRead}
          >
            Mark all as read
          </Button>
        )}
      </div>
      
      <div className="max-h-[350px] overflow-y-auto pr-1">
        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                  notification.read ? 'bg-secondary/30' : 'bg-secondary/70'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2">
                  {notification.communityImageURL ? (
                    <Avatar className="h-8 w-8 border border-border/50">
                      <AvatarImage src={notification.communityImageURL} alt={notification.communityName || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {notification.communityName?.charAt(0) || 'E'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-snug">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </span>
                      {!notification.read && (
                        <Badge variant="default" className="h-1.5 w-1.5 rounded-full p-0" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [subscribedCommunityIds, setSubscribedCommunityIds] = useState<string[]>([]);
  const isMobileHook = useIsMobile();
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Determine if mobile based on both the hook and direct window width
  const isMobile = windowWidth < MOBILE_BREAKPOINT;
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const allNotifications: Notification[] = [];
    const readClientIds = getReadClientNotificationIds(); // Get locally stored read IDs

    // 1. Find all events where user is registered for notifications
    const registeredEventsQuery = query(
      collection(db, 'events'),
      where('hasNotifications', '==', true)
    );
    const eventsSnapshot = await getDocs(registeredEventsQuery);

    eventsSnapshot.forEach(eventDoc => {
      const eventData = eventDoc.data();
      if (eventData.pendingApproval) return;

      const isRegistered = eventData.registrations?.some(
        (reg: any) => reg.userId === user.uid && reg.status === 'approved'
      );

      if (isRegistered && eventData.notifications) {
        eventData.notifications.forEach((notif: any) => {
          allNotifications.push({
            id: `event-${eventDoc.id}-${notif.timestamp.toDate().getTime()}`,
            type: notif.type,
            message: notif.message,
            timestamp: notif.timestamp.toDate(),
            eventId: eventDoc.id,
            eventName: eventData.name,
            communityId: eventData.communityId,
            communityName: eventData.communityName,
            communityImageURL: eventData.communityImageURL,
            read: notif.readBy?.includes(user.uid) || false
          });
        });
      }
    });

    try {
      const userCommunitiesQuery = query(
        collection(db, 'communities'),
        where('members', 'array-contains', user.uid)
      );
      const userCommunitiesSnapshot = await getDocs(userCommunitiesQuery);
      const userCommunityIds = userCommunitiesSnapshot.docs.map(doc => doc.id);

      if (userCommunityIds.length > 0) {
        const communityEventsQuery = query(
          collection(db, 'events'),
          where('communityId', 'in', userCommunityIds)
        );
        const communityEventsSnapshot = await getDocs(communityEventsQuery);

        for (const eventDoc of communityEventsSnapshot.docs) {
          const eventData = eventDoc.data();
          const eventCreatedAt = eventData.createdAt?.toDate() || new Date();
          const isRecent = (Date.now() - eventCreatedAt.getTime()) < 7 * 24 * 60 * 60 * 1000;
          const isCreator = eventData.createdBy === user.uid;
          const isAlreadyRegistered = eventData.registrations?.some((reg: any) => reg.userId === user.uid) || eventData.pendingRegistrations?.some((reg: any) => reg.userId === user.uid);

          if (!eventData.pendingApproval && !isAlreadyRegistered && isRecent && !isCreator) {
            const notificationId = `community-event-${eventDoc.id}`;
            allNotifications.push({
              id: notificationId,
              type: 'new_community_event',
              message: `New event in ${eventData.communityName || 'your community'}`,
              timestamp: eventCreatedAt,
              eventId: eventDoc.id,
              eventName: eventData.name,
              communityId: eventData.communityId,
              communityName: eventData.communityName,
              communityImageURL: eventData.communityImageURL,
              read: readClientIds.includes(notificationId),
              actionable: true
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching community events:', error);
    }
    
    // 3. Find events for subscribed communities (if not already a member)
    if (subscribedCommunityIds.length > 0) {
      
    }

    allNotifications.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(allNotifications);
  }, [user, subscribedCommunityIds]);

  useEffect(() => {
    if (!user) return;

    const fetchSubscribedCommunities = async () => {
        const communitiesQuery = query(collection(db, 'communities'), where('subscribedUsers', 'array-contains', user.uid));
        const communitiesSnapshot = await getDocs(communitiesQuery);
        setSubscribedCommunityIds(communitiesSnapshot.docs.map(doc => doc.id));
    };
    
    fetchSubscribedCommunities();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();
    
    const eventsQuery = query(collection(db, 'events'));
    
    const unsubscribe = onSnapshot(eventsQuery, () => {
      fetchNotifications();
    });
    
    return () => unsubscribe();
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || !user) return;

    try {
      if (notification.type === 'new_community_event' || notification.type === 'subscribed_community_event') {
        addReadClientNotificationIds([notification.id]); // --- Fix: Persist read state to localStorage
        setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
      } else {
        const eventRef = doc(db, 'events', notification.eventId);
        const eventDoc = await getDoc(eventRef);
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const updatedNotifications = eventData.notifications.map((n: any) => {
            if (new Date(notification.timestamp).getTime() === n.timestamp.toDate().getTime()) {
              const readBy = n.readBy || [];
              if (!readBy.includes(user.uid)) readBy.push(user.uid);
              return { ...n, readBy };
            }
            return n;
          });
          await updateDoc(eventRef, { notifications: updatedNotifications });
          // The onSnapshot listener will handle the UI update
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    try {
      
      // 1. Handle client-side notifications
      const clientNotificationIds = unread
        .filter(n => n.type === 'new_community_event' || n.type === 'subscribed_community_event')
        .map(n => n.id);
      
      addReadClientNotificationIds(clientNotificationIds);
      
      // 2. Optimistically update UI
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    

      // 3. Handle database notifications
      const dbNotifications = unread.filter(n => !clientNotificationIds.includes(n.id));
      const notificationsByEvent: Record<string, Notification[]> = {};

      dbNotifications.forEach(n => {
        if (!notificationsByEvent[n.eventId]) notificationsByEvent[n.eventId] = [];
        notificationsByEvent[n.eventId].push(n);
      });

      const updatePromises = Object.keys(notificationsByEvent).map(async eventId => {
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const updatedNotifications = eventData.notifications.map((n: any) => {
            const match = notificationsByEvent[eventId].find(
              notif => new Date(notif.timestamp).getTime() === n.timestamp.toDate().getTime()
            );
            if (match) {
              const readBy = n.readBy || [];
              if (!readBy.includes(user.uid)) readBy.push(user.uid);
              return { ...n, readBy };
            }
            return n;
          });
          return updateDoc(eventRef, { notifications: updatedNotifications });
        }
      });

      await Promise.all(updatePromises);
      
      toast({
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Mobile version uses Sheet component
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="notification-bell-mobile">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] sm:w-[350px] bg-background/95 backdrop-blur-lg border-border/30">
          <div className="pt-6">
            <NotificationContent 
              notifications={notifications}
              markAsRead={markAsRead}
              markAllAsRead={markAllAsRead}
              setOpen={setOpen}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop version uses Popover component
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-full hover:bg-secondary/50 transition-all duration-300"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-3 bg-secondary/90 backdrop-blur-sm border-border/30 shadow-xl" 
        align="end"
        sideOffset={8}
      >
        <NotificationContent 
          notifications={notifications}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          setOpen={setOpen}
        />
      </PopoverContent>
    </Popover>
  );
};