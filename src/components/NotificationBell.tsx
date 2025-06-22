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



export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [subscribedCommunityIds, setSubscribedCommunityIds] = useState<string[]>([]);

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
          await updateDoc(eventRef, { notifications: updatedNotifications });
        }
      });

      await Promise.all(updatePromises);
      
      toast({
        title: "Notifications cleared",
        description: "All notifications have been marked as read."
      });
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive"
      });
      // Re-fetch to get the correct state from the server on error
      fetchNotifications();
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const unreadCount = unreadNotifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground text-xs"
              variant="default"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 max-h-[500px] overflow-hidden flex flex-col p-0 bg-secondary/90 backdrop-blur-sm border-border/30 shadow-lg"
        align="end"
      >
        <div className="px-4 py-3 border-b border-border/20 flex justify-between items-center">
          <h3 className="font-medium text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 px-2 hover:bg-background/50"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="overflow-y-auto max-h-[400px]">
          {unreadNotifications.length > 0 ? (
            <div className="divide-y divide-border/20">
              {unreadNotifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`p-3 bg-secondary/30 ${notification.actionable ? 'cursor-pointer hover:bg-secondary/40 transition-colors duration-200' : ''}`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.actionable && notification.eventId) {
                      window.location.href = `/event/${notification.eventId}`;
                    }
                    setOpen(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                     <Avatar className="h-10 w-10 transition-transform duration-200 group-hover:scale-105">
                      {notification.communityImageURL ? (
                        <AvatarImage src={notification.communityImageURL} alt={notification.communityName || 'Community'} />
                      ) : null}
                      <AvatarFallback className={`
                        ${notification.type === 'date_changed' ? 'bg-blue-500/20 text-blue-500' : ''}
                        ${notification.type === 'venue_changed' ? 'bg-amber-500/20 text-amber-500' : ''}
                        ${notification.type === 'message_added' ? 'bg-emerald-500/20 text-emerald-500' : ''}
                        ${notification.type === 'new_community_event' ? 'bg-primary/20 text-primary' : ''}
                        ${notification.type === 'registration_approved' ? 'bg-emerald-500/20 text-emerald-500' : ''}
                      `}>
                        {notification.type === 'date_changed' ? 'D' : 
                         notification.type === 'venue_changed' ? 'V' : 
                         notification.type === 'message_added' ? 'M' : 
                         notification.type === 'new_community_event' ? 'E' : 
                         notification.type === 'registration_approved' ? 'A' : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors duration-200">
                          {notification.eventName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      
                      {notification.communityName && (
                        <p className="text-xs font-medium text-primary mt-0.5">
                          {notification.communityName}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      
                      {notification.actionable && (
                        <div className="mt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary hover:text-primary transition-colors duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                              window.location.href = `/event/${notification.eventId}`;
                            }}
                          >
                            View Event Details
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No new notifications</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};