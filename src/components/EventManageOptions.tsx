import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, MessageCircle, AlertTriangle, Users, Check, X, Loader2, QrCode, Share2, Copy, Check as CheckIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { EventEditModal } from './EventEditModal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  pendingApproval?: boolean;
  communityId?: string;
}

interface EventManageOptionsProps {
  event: Event;
  onEventUpdated: () => void;
  onEventDeleted: () => void;
}

export const EventManageOptions: React.FC<EventManageOptionsProps> = ({
  event,
  onEventUpdated,
  onEventDeleted
}) => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFullToggleDialog, setShowFullToggleDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullToggleSubmitting, setIsFullToggleSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'events', event.id));
      toast({
        title: 'Event Deleted',
        description: 'Your event has been successfully deleted.',
      });
      onEventDeleted();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleMessageSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      const eventRef = doc(db, 'events', event.id);
      const eventSnapshot = await getDoc(eventRef);
      const currentEventData = eventSnapshot.exists() ? eventSnapshot.data() : null;
      
      // Create a notifications field for the message
      const notifications = currentEventData?.notifications || [];
      
      // Add message notification
      notifications.push({
        type: 'message_added',
        message: message,
        timestamp: new Date(),
        readBy: []
      });
      
      // Update the event document
      await updateDoc(eventRef, {
        message: message,
        notifications: notifications,
        hasNotifications: true
      });
      
      setShowMessageDialog(false);
      setMessage('');
      
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to all approved participants.',
      });
      
      onEventUpdated();
    } catch (error) {
      console.error('Error adding message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEventFull = async (isEventFull: boolean) => {
    setIsFullToggleSubmitting(true);
    try {
      const eventRef = doc(db, 'events', event.id);
      
      // Update the event document with the new isFull status
      await updateDoc(eventRef, {
        isFull: isEventFull
      });
      
      toast({
        title: isEventFull ? 'Event Marked as Full' : 'Event Marked as Available',
        description: isEventFull 
          ? 'Users will now see that this event is full and cannot register.' 
          : 'Users can now register for this event again.',
      });
      
      // Close the dialog and update the event list
      setShowFullToggleDialog(false);
      onEventUpdated();
    } catch (error) {
      console.error('Error updating event status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsFullToggleSubmitting(false);
    }
  };

  const generateShareableLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/event/${event.id}?ref=share`;
  };

  const handleCopyLink = () => {
    const link = generateShareableLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    
    toast({
      title: 'Link Copied!',
      description: 'Shareable link has been copied to clipboard.',
    });
    
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="group h-9 w-9 rounded-full border-border/50 bg-secondary/50 hover:bg-secondary/70 transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-primary/10 active:scale-95"
          >
            <MoreHorizontal className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:rotate-90" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-56 bg-secondary/90 backdrop-blur-sm border-border/30 shadow-lg animate-in slide-in-from-top-5 duration-200" 
          align="end"
        >
          <DropdownMenuItem 
            onClick={() => setShowEditModal(true)}
            className="flex items-center cursor-pointer hover:bg-primary/10 rounded-md my-1 mx-1 px-3 py-2 transition-all duration-200 group"
          >
            <Pencil className="mr-2 h-4 w-4 text-primary/70 group-hover:text-primary transition-colors duration-200 group-hover:scale-110 transform" />
            <span className="font-medium group-hover:translate-x-1 transition-transform duration-200">Edit Event</span>
          </DropdownMenuItem>
          
          {event.pendingApproval && event.communityId && (
            <DropdownMenuItem
              className="flex items-center text-amber-500 cursor-default hover:bg-amber-500/10 rounded-md my-1 mx-1 px-3 py-2 transition-all duration-200 group"
            >
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-500/70" />
              <span className="font-medium">Pending Approval</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem
            onClick={() => setShowMessageDialog(true)}
            className="flex items-center cursor-pointer hover:bg-blue-500/10 rounded-md my-1 mx-1 px-3 py-2 transition-all duration-200 group"
          >
            <MessageCircle className="mr-2 h-4 w-4 text-blue-500/70 group-hover:text-blue-500 transition-colors duration-200 group-hover:scale-110 transform" />
            <span className="font-medium group-hover:translate-x-1 transition-transform duration-200">Send Message to Participants</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowShareDialog(true)}
            className="flex items-center cursor-pointer hover:bg-teal-500/10 rounded-md my-1 mx-1 px-3 py-2 transition-all duration-200 group"
          >
            <Share2 className="mr-2 h-4 w-4 text-teal-500/70 group-hover:text-teal-500 transition-colors duration-200 group-hover:scale-110 transform" />
            <span className="font-medium group-hover:translate-x-1 transition-transform duration-200">Share Event</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowFullToggleDialog(true)}
            className={`flex items-center cursor-pointer ${event.isFull ? 'hover:bg-emerald-500/10' : 'hover:bg-amber-500/10'} rounded-md my-1 mx-1 px-3 py-2 transition-all duration-200 group`}
          >
            <Users className={`mr-2 h-4 w-4 ${event.isFull ? 'text-emerald-500/70 group-hover:text-emerald-500' : 'text-amber-500/70 group-hover:text-amber-500'} transition-colors duration-200 group-hover:scale-110 transform`} />
            <span className="font-medium group-hover:translate-x-1 transition-transform duration-200">
              {event.isFull ? 'Mark as Available' : 'Mark as Full'}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate(`/scan-ticket?eventId=${event.id}`)}
            className="flex items-center cursor-pointer hover:bg-violet-500/10 rounded-md my-1 mx-1 px-3 py-2 transition-all duration-200 group"
          >
            <QrCode className="mr-2 h-4 w-4 text-violet-500/70 group-hover:text-violet-500 transition-colors duration-200 group-hover:scale-110 transform" />
            <span className="font-medium group-hover:translate-x-1 transition-transform duration-200">Scan Tickets</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="mx-1 bg-border/20" />
          <DropdownMenuItem
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center cursor-pointer text-destructive hover:bg-destructive/10 rounded-md my-1 mx-1 px-3 py-2 transition-all duration-200 group"
          >
            <Trash2 className="mr-2 h-4 w-4 group-hover:text-destructive transition-colors duration-200 group-hover:scale-110 transform" />
            <span className="font-medium group-hover:translate-x-1 transition-transform duration-200">Delete Event</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="glass-dark border-border/30 animate-in zoom-in-95 slide-in-from-bottom-5 duration-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event "{event.name}" and
              remove all associated data including registrations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="group bg-destructive hover:bg-destructive/90 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Message Dialog */}
      <AlertDialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <AlertDialogContent className="glass-dark border-border/30 animate-in zoom-in-95 slide-in-from-bottom-5 duration-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Send Message to Participants</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be sent as a notification to all approved participants of "{event.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Textarea
              className="bg-background/50 border-border/50 transition-all duration-300 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_10px_rgba(139,92,246,0.1)]"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <div className="flex items-center mt-2 text-xs text-muted-foreground group">
              <AlertTriangle className="h-3 w-3 mr-1 text-amber-500/70 group-hover:text-amber-500 transition-colors duration-200" />
              <span className="transition-opacity duration-200 group-hover:opacity-90">This will be visible to all participants who have been approved for this event.</span>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md">Cancel</AlertDialogCancel>
            <Button 
              className="group bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md"
              onClick={handleMessageSubmit}
              disabled={!message.trim() || isSubmitting}
            >
              <MessageCircle className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
              Send Message
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Event Full Toggle Dialog */}
      <AlertDialog open={showFullToggleDialog} onOpenChange={setShowFullToggleDialog}>
        <AlertDialogContent className="glass-dark border-border/30 animate-in zoom-in-95 slide-in-from-bottom-5 duration-200">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {event.isFull 
                ? 'Mark Event as Available?' 
                : 'Mark Event as Full?'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {event.isFull 
                ? 'This will allow users to register for this event again.' 
                : 'This will prevent new users from registering for this event.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center justify-between py-4 px-1">
            <Label htmlFor="event-full-switch" className="flex items-center cursor-pointer space-x-2 text-sm font-medium">
              <span>Event is currently:</span>
              <span className={`font-semibold ${event.isFull ? 'text-amber-500' : 'text-emerald-500'}`}>
                {event.isFull ? 'Full' : 'Available'}
              </span>
            </Label>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-secondary/50">
                {event.isFull 
                  ? <X className="h-4 w-4 text-amber-500" /> 
                  : <Check className="h-4 w-4 text-emerald-500" />
                }
              </div>
              <Switch 
                id="event-full-switch"
                checked={!event.isFull}
                onCheckedChange={(checked) => handleToggleEventFull(!checked)}
                disabled={isFullToggleSubmitting}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-amber-500"
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md">Cancel</AlertDialogCancel>
            <Button 
              className={`group transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md ${event.isFull ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}`}
              onClick={() => handleToggleEventFull(!event.isFull)}
              disabled={isFullToggleSubmitting}
            >
              {isFullToggleSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Users className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
              )}
              {event.isFull ? 'Mark as Available' : 'Mark as Full'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Event Dialog */}
      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent className="glass-dark border-border/30 animate-in zoom-in-95 slide-in-from-bottom-5 duration-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Share Event</AlertDialogTitle>
            <AlertDialogDescription>
              Share this link with others for quick signup to "{event.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <div className="flex items-center space-x-2">
              <Input
                className="bg-background/50 border-border/50 transition-all duration-300 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_10px_rgba(139,92,246,0.1)]"
                value={generateShareableLink()}
                readOnly
              />
              <Button 
                variant="outline" 
                size="icon" 
                className={`transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md ${copied ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'hover:bg-teal-500/10 hover:text-teal-500 hover:border-teal-500/30'}`}
                onClick={handleCopyLink}
              >
                {copied ? <CheckIcon className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center mt-4 text-sm text-muted-foreground">
              <Share2 className="h-4 w-4 mr-2 text-teal-500" />
              <span>Anyone with this link can view and register for this event.</span>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Event Modal */}
      <EventEditModal
        event={showEditModal ? event : null}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onEventUpdated={onEventUpdated}
      />
    </>
  );
}; 