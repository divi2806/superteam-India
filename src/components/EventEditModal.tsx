import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Loader2, Users2 } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface Event {
  id: string;
  name: string;
  venue: string;
  mode: 'online' | 'offline';
  description: string;
  date: string;
  time: string;
  coordinates?: [number, number];
  address?: string;
  message?: string;
  isFull?: boolean;
}

interface EventEditModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
}

export const EventEditModal: React.FC<EventEditModalProps> = ({ 
  event, 
  isOpen, 
  onClose,
  onEventUpdated
}) => {
  const [formData, setFormData] = useState<Event>({
    id: '',
    name: '',
    venue: '',
    mode: 'offline',
    description: '',
    date: '',
    time: '',
    message: '',
    isFull: false,
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id,
        name: event.name,
        venue: event.venue,
        mode: event.mode,
        description: event.description,
        date: event.date,
        time: event.time,
        coordinates: event.coordinates,
        address: event.address,
        message: event.message || '',
        isFull: event.isFull,
      });
    }
  }, [event]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setLoading(true);
    try {
      const eventDocRef = doc(db, 'events', event.id);
      const eventSnapshot = await getDoc(eventDocRef);
      const currentEventData = eventSnapshot.exists() ? eventSnapshot.data() : null;
      
      // Create a notifications field for any changes
      const notifications = currentEventData?.notifications || [];
      let hasChanges = false;
      
      // Check what changed for notifications
      if (formData.date !== event.date || formData.time !== event.time) {
        notifications.push({
          type: 'date_changed',
          message: `Event date/time has been updated to ${formData.date} at ${formData.time}`,
          timestamp: new Date(),
          readBy: []
        });
        hasChanges = true;
      }
      
      if (formData.venue !== event.venue) {
        notifications.push({
          type: 'venue_changed',
          message: `Event location has been updated to ${formData.venue}`,
          timestamp: new Date(),
          readBy: []
        });
        hasChanges = true;
      }
      
      if (formData.message && formData.message !== event.message) {
        notifications.push({
          type: 'message_added',
          message: formData.message,
          timestamp: new Date(),
          readBy: []
        });
        hasChanges = true;
      }
      
      // Check if this is a community event
      const isCommunityEvent = currentEventData?.communityId;
      
      // Update the event
      await updateDoc(eventDocRef, {
        name: formData.name,
        venue: formData.venue,
        mode: formData.mode,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        coordinates: formData.coordinates,
        address: formData.address,
        message: formData.message,
        isFull: formData.isFull,
        lastUpdated: new Date(),
        ...(notifications.length > 0 && { 
          notifications: notifications,
          hasNotifications: true
        })
      });
      
      // If this is a community event and there are changes, notify members
      if (isCommunityEvent && hasChanges) {
        try {
          const communityId = currentEventData.communityId;
          const communityDoc = await getDoc(doc(db, 'communities', communityId));
          
          if (communityDoc.exists()) {
            const communityData = communityDoc.data();
            const communityMembers = communityData.members || [];
            
            // Log notification for community members
            console.log(`Event updated in community ${currentEventData.communityName}, notifying ${communityMembers.length} members`);
            
            toast({
              title: "Community Notified",
              description: `Members of ${currentEventData.communityName} will be notified of these changes.`,
            });
          }
        } catch (error) {
          console.error('Error handling community notifications:', error);
          // Continue with event update even if notification process fails
        }
      }
      
      toast({
        title: "Event Updated",
        description: "Your event has been successfully updated.",
      });
      
      onEventUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="glass-dark border-border/30 max-w-xl max-h-[90vh] overflow-y-auto" 
        closeButtonClassName="absolute right-4 top-4 rounded-full h-8 w-8 flex items-center justify-center bg-secondary/50 opacity-100 ring-offset-0 hover:bg-secondary/80 transition-colors"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground pr-6">Edit Event</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Event Name</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="bg-background/50 border-border/50"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Mode</label>
            <Select
              value={formData.mode}
              onValueChange={(value) => setFormData(prev => ({ ...prev, mode: value as 'online' | 'offline' }))}
              required
            >
              <SelectTrigger className="bg-background/50 border-border/50">
                <SelectValue placeholder="Select event mode" />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border/30">
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Date</span>
              </label>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="bg-background/50 border-border/50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Time</span>
              </label>
              <Input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                className="bg-background/50 border-border/50"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Location</span>
            </label>
            <Input
              name="venue"
              value={formData.venue}
              onChange={handleInputChange}
              className="bg-background/50 border-border/50"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="bg-background/50 border-border/50"
              rows={3}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Message for Participants
              <span className="text-xs text-muted-foreground ml-2">(Optional - will be sent as notification)</span>
            </label>
            <Textarea
              name="message"
              value={formData.message || ''}
              onChange={handleInputChange}
              placeholder="Add an important message or update for participants (e.g., 'Free T-shirts for everyone!')"
              className="bg-background/50 border-border/50"
              rows={2}
            />
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Event'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 