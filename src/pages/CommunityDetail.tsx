import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Users, Share, ClipboardCopy, Bell, BellOff, Plus, ChevronLeft, ChevronRight, ExternalLink, Edit, Upload, ImageIcon, Trash2, AlertTriangle, Clock, Calendar, User, MoreVertical, UserPlus, UserMinus, ShieldCheck, ShieldX, MapPin, X, Linkedin, Twitter, Globe, Check } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Community {
  id: string;
  name: string;
  description: string;
  imageURL: string;
  bannerURL?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  members: string[];
  moderators?: string[];
  subscribedUsers?: string[];
}

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
  pendingApproval?: boolean;
}

interface Member {
  id: string;
  name?: string;
  photoURL?: string;
  email?: string;
  role?: 'admin' | 'moderator' | 'member';
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  personalUrl?: string;
}

const fetchMemberData = async (userId: string): Promise<Member | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        id: userDoc.id,
        name: userData.name || userData.displayName,
        photoURL: userData.photoURL,
        email: userData.email,
        bio: userData.bio || '',
        linkedinUrl: userData.linkedinUrl || '',
        twitterUrl: userData.twitterUrl || '',
        personalUrl: userData.personalUrl || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching member data:', error);
    return null;
  }
};

const isAdmin = (community: Community | null, userId: string | undefined): boolean => {
  if (!community || !userId) return false;
  return community.createdBy === userId;
};

const isModerator = (community: Community | null, userId: string | undefined): boolean => {
  if (!community || !userId) return false;
  return (community.moderators && community.moderators.includes(userId)) || false;
};

const canModerate = (community: Community | null, userId: string | undefined): boolean => {
  return isAdmin(community, userId) || isModerator(community, userId);
};

const CommunityDetail = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isUserSubscribed, setIsUserSubscribed] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showMemberActionDialog, setShowMemberActionDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [processingMemberAction, setProcessingMemberAction] = useState(false);
  const [showEventApprovalDialog, setShowEventApprovalDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [processingEventAction, setProcessingEventAction] = useState(false);
  const [showMemberProfileDialog, setShowMemberProfileDialog] = useState(false);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<Member | null>(null);
  
  // Edit community state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedCommunity, setEditedCommunity] = useState({
    name: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [editBanner, setEditBanner] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Delete community state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  useEffect(() => {
    if (!community || !community.members || community.members.length === 0) return;
    
    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const memberPromises = community.members.map(async (memberId) => {
          const memberData = await fetchMemberData(memberId);
          if (memberData) {
            // Assign role to member
            if (community.createdBy === memberId) {
              memberData.role = 'admin';
            } else if (community.moderators && community.moderators.includes(memberId)) {
              memberData.role = 'moderator';
            } else {
              memberData.role = 'member';
            }
          }
          return memberData;
        });
        
        const memberResults = await Promise.all(memberPromises);
        const validMembers = memberResults.filter((member): member is Member => member !== null);
        setMembers(validMembers);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };
    
    fetchMembers();
  }, [community]);
  
  useEffect(() => {
    if (!communityId) {
      navigate('/community');
      return;
    }
    
    const fetchCommunityDetails = async () => {
      setLoading(true);
      try {
        const communityDoc = await getDoc(doc(db, 'communities', communityId));
        if (!communityDoc.exists()) {
          toast({
            title: "Community not found",
            description: "The community you're looking for doesn't exist or has been deleted.",
            variant: "destructive",
          });
          navigate('/community');
          return;
        }
        
        const communityData = {
          id: communityDoc.id,
          ...communityDoc.data()
        } as Community;
        
        setCommunity(communityData);
        
        // Initialize edit form with current values
        setEditedCommunity({
          name: communityData.name,
          description: communityData.description,
        });
        setEditBanner(!!communityData.bannerURL);
        
        setIsUserSubscribed(communityData.subscribedUsers?.includes(user?.uid || '') || false);
        
        // Generate embed code
        const baseUrl = window.location.origin;
        const embedUrl = `${baseUrl}/embed/community-calendar/${communityId}`;
        setEmbedCode(`<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`);
        
        // Set up listener for community events
        const eventsQuery = query(
          collection(db, 'events'),
          where('communityId', '==', communityId),
          where('pendingApproval', '==', false)
        );
        
        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
          const eventsData: Event[] = [];
          snapshot.forEach((doc) => {
            eventsData.push({
              id: doc.id,
              ...doc.data()
            } as Event);
          });
          
          // Sort events by date
          eventsData.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA.getTime() - dateB.getTime();
          });
          
          setEvents(eventsData);
          setLoading(false);
        });
        
        // Set up listener for pending events (only for admins and moderators)
        if (canModerate(communityData, user?.uid)) {
          const pendingEventsQuery = query(
            collection(db, 'events'),
            where('communityId', '==', communityId),
            where('pendingApproval', '==', true)
          );
          
          const unsubscribePendingEvents = onSnapshot(pendingEventsQuery, (snapshot) => {
            const pendingEventsData: Event[] = [];
            snapshot.forEach((doc) => {
              pendingEventsData.push({
                id: doc.id,
                ...doc.data()
              } as Event);
            });
            
            // Sort pending events by date
            pendingEventsData.sort((a, b) => {
              const dateA = new Date(`${a.date}T${a.time}`);
              const dateB = new Date(`${b.date}T${b.time}`);
              return dateA.getTime() - dateB.getTime();
            });
            
            setPendingEvents(pendingEventsData);
          });
          
          return () => {
            unsubscribeEvents();
            unsubscribePendingEvents();
          };
        }
        
        return unsubscribeEvents;
      } catch (error) {
        console.error('Error fetching community details:', error);
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to load community details. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchCommunityDetails();
  }, [communityId, navigate, user?.uid]);
  
  const handleSubscribe = async () => {
    if (!user || !communityId || !community) return;
    
    setSubscribing(true);
    try {
      const communityRef = doc(db, 'communities', communityId);
      
      if (isUserSubscribed) {
        // Unsubscribe
        await updateDoc(communityRef, {
          subscribedUsers: arrayRemove(user.uid)
        });
        setIsUserSubscribed(false);
        toast({
          title: "Unsubscribed",
          description: `You will no longer receive notifications for ${community.name}.`,
        });
      } else {
        // Subscribe
        await updateDoc(communityRef, {
          subscribedUsers: arrayUnion(user.uid)
        });
        setIsUserSubscribed(true);
        toast({
          title: "Subscribed",
          description: `You will now receive notifications for new events in ${community.name}.`,
        });
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };
  
  const handleCopyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard.",
    });
  };
  
  const handleJoinCommunity = async () => {
    if (!user || !communityId) return;
    
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        members: arrayUnion(user.uid)
      });
      
      toast({
        title: "Joined Community",
        description: "You have successfully joined this community.",
      });
    } catch (error) {
      console.error('Error joining community:', error);
      toast({
        title: "Error",
        description: "Failed to join community. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleLeaveCommunity = async () => {
    if (!user || !communityId) return;
    
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        members: arrayRemove(user.uid)
      });
      
      toast({
        title: "Left Community",
        description: "You have left this community.",
      });
    } catch (error) {
      console.error('Error leaving community:', error);
      toast({
        title: "Error",
        description: "Failed to leave community. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const isUserMember = useMemo(() => {
    if (!user || !community) return false;
    return community.members?.includes(user.uid) || false;
  }, [user, community]);
  
  const isOwner = useMemo(() => {
    if (!user || !community) return false;
    return community.createdBy === user.uid;
  }, [user, community]);
  
  // Group events by day for the calendar view
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
  
  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Fill in days from previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = new Date(year, month, 1 - (firstDayOfWeek - i));
      days.push({
        date: day,
        isCurrentMonth: false,
        events: eventsByDate[format(day, 'yyyy-MM-dd')] || []
      });
    }
    
    // Add days of the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push({
        date: day,
        isCurrentMonth: true,
        events: eventsByDate[format(day, 'yyyy-MM-dd')] || []
      });
    }
    
    // Add days from next month to complete the last week
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
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBannerFile(e.target.files[0]);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBannerPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  
  const handleUpdateCommunity = async () => {
    if (!user || !community) return;
    
    if (!editedCommunity.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please provide a name for your community.",
        variant: "destructive",
      });
      return;
    }
    
    setUpdating(true);
    try {
      const communityRef = doc(db, 'communities', community.id);
      let updateData: any = {
        name: editedCommunity.name,
        description: editedCommunity.description,
      };
      
      // Upload new image if provided
      if (imageFile) {
        const storageRef = ref(storage, `community_images/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        const imageURL = await getDownloadURL(uploadResult.ref);
        updateData.imageURL = imageURL;
      }
      
      // Handle banner
      if (editBanner) {
        if (bannerFile) {
          // Upload new banner
          const bannerRef = ref(storage, `community_banners/${Date.now()}_${bannerFile.name}`);
          const bannerUploadResult = await uploadBytes(bannerRef, bannerFile);
          const bannerURL = await getDownloadURL(bannerUploadResult.ref);
          updateData.bannerURL = bannerURL;
        }
      } else {
        // Remove banner if it exists
        if (community.bannerURL) {
          updateData.bannerURL = null;
        }
      }
      
      await updateDoc(communityRef, updateData);
      
      // Reset form
      setImageFile(null);
      setImagePreview(null);
      setBannerFile(null);
      setBannerPreview(null);
      setShowEditDialog(false);
      
      toast({
        title: "Community Updated",
        description: "Your community has been successfully updated.",
      });
      
      // Update local state with new values
      setCommunity(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...updateData
        };
      });
      
    } catch (error) {
      console.error('Error updating community:', error);
      toast({
        title: "Error",
        description: "Failed to update community. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };
  
  const handleDeleteCommunity = async () => {
    if (!user || !community || !isOwner) return;
    
    setDeleting(true);
    try {
      // Delete the community document
      await deleteDoc(doc(db, 'communities', community.id));
      
      toast({
        title: "Community Deleted",
        description: "Your community has been successfully deleted.",
      });
      
      // Navigate back to communities page
      navigate('/community');
    } catch (error) {
      console.error('Error deleting community:', error);
      setDeleting(false);
      toast({
        title: "Error",
        description: "Failed to delete community. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handlePromoteToModerator = async (memberId: string) => {
    if (!community || !user || !isAdmin(community, user.uid)) return;
    
    setProcessingMemberAction(true);
    try {
      const communityRef = doc(db, 'communities', community.id);
      
      // Add user to moderators array
      await updateDoc(communityRef, {
        moderators: arrayUnion(memberId)
      });
      
      toast({
        title: "Moderator Added",
        description: "The member has been promoted to moderator.",
      });
      
      // Update local state
      setCommunity(prev => {
        if (!prev) return prev;
        
        const updatedModerators = prev.moderators ? [...prev.moderators, memberId] : [memberId];
        return { ...prev, moderators: updatedModerators };
      });
      
      // Update member role in the UI
      setMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, role: 'moderator' } 
            : member
        )
      );
      
      setShowMemberActionDialog(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error promoting to moderator:', error);
      toast({
        title: "Error",
        description: "Failed to promote member to moderator.",
        variant: "destructive",
      });
    } finally {
      setProcessingMemberAction(false);
    }
  };
  
  const handleRemoveFromModerators = async (memberId: string) => {
    if (!community || !user || !isAdmin(community, user.uid)) return;
    
    setProcessingMemberAction(true);
    try {
      const communityRef = doc(db, 'communities', community.id);
      
      // Remove user from moderators array
      await updateDoc(communityRef, {
        moderators: arrayRemove(memberId)
      });
      
      toast({
        title: "Moderator Removed",
        description: "The member has been removed from moderators.",
      });
      
      // Update local state
      setCommunity(prev => {
        if (!prev || !prev.moderators) return prev;
        
        const updatedModerators = prev.moderators.filter(id => id !== memberId);
        return { ...prev, moderators: updatedModerators };
      });
      
      // Update member role in the UI
      setMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, role: 'member' } 
            : member
        )
      );
      
      setShowMemberActionDialog(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error removing from moderators:', error);
      toast({
        title: "Error",
        description: "Failed to remove member from moderators.",
        variant: "destructive",
      });
    } finally {
      setProcessingMemberAction(false);
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!community || !user || !canModerate(community, user.uid)) return;
    
    // Don't allow removing the admin
    if (community.createdBy === memberId) {
      toast({
        title: "Cannot Remove Admin",
        description: "The community creator cannot be removed.",
        variant: "destructive",
      });
      return;
    }
    
    // Don't allow moderators to remove other moderators
    if (isModerator(community, user.uid) && isModerator(community, memberId)) {
      toast({
        title: "Permission Denied",
        description: "Moderators cannot remove other moderators.",
        variant: "destructive",
      });
      return;
    }
    
    setProcessingMemberAction(true);
    try {
      const communityRef = doc(db, 'communities', community.id);
      
      // Remove user from members array
      await updateDoc(communityRef, {
        members: arrayRemove(memberId)
      });
      
      // If the member is also a moderator, remove from moderators array
      if (community.moderators && community.moderators.includes(memberId)) {
        await updateDoc(communityRef, {
          moderators: arrayRemove(memberId)
        });
      }
      
      toast({
        title: "Member Removed",
        description: "The member has been removed from the community.",
      });
      
      // Update local state
      setCommunity(prev => {
        if (!prev) return prev;
        
        const updatedMembers = prev.members.filter(id => id !== memberId);
        const updatedModerators = prev.moderators 
          ? prev.moderators.filter(id => id !== memberId) 
          : undefined;
        
        return { 
          ...prev, 
          members: updatedMembers,
          moderators: updatedModerators
        };
      });
      
      // Update members list in the UI
      setMembers(prev => prev.filter(member => member.id !== memberId));
      
      setShowMemberActionDialog(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member from the community.",
        variant: "destructive",
      });
    } finally {
      setProcessingMemberAction(false);
    }
  };
  
  const handleApproveEvent = async (eventId: string) => {
    if (!community || !user || !canModerate(community, user.uid)) return;
    
    setProcessingEventAction(true);
    try {
      const eventRef = doc(db, 'events', eventId);
      
      // Update event to remove pendingApproval flag
      await updateDoc(eventRef, {
        pendingApproval: false
      });
      
      toast({
        title: "Event Approved",
        description: "The event has been approved and is now visible to all members.",
      });
      
      // Update local state
      setPendingEvents(prev => prev.filter(event => event.id !== eventId));
      
      setShowEventApprovalDialog(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error approving event:', error);
      toast({
        title: "Error",
        description: "Failed to approve the event.",
        variant: "destructive",
      });
    } finally {
      setProcessingEventAction(false);
    }
  };
  
  const handleRejectEvent = async (eventId: string) => {
    if (!community || !user || !canModerate(community, user.uid)) return;
    
    setProcessingEventAction(true);
    try {
      // Delete the event entirely
      const eventRef = doc(db, 'events', eventId);
      await deleteDoc(eventRef);
      
      toast({
        title: "Event Rejected",
        description: "The event has been rejected and removed.",
      });
      
      // Update local state
      setPendingEvents(prev => prev.filter(event => event.id !== eventId));
      
      setShowEventApprovalDialog(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast({
        title: "Error",
        description: "Failed to reject the event.",
        variant: "destructive",
      });
    } finally {
      setProcessingEventAction(false);
    }
  };
  
  const handleViewMemberProfile = (member: Member) => {
    setSelectedMemberProfile(member);
    setShowMemberProfileDialog(true);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading community details...</p>
        </div>
      </div>
    );
  }
  
  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
        <Card className="glass-dark border-border/30 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Community Not Found</h2>
            <p className="text-muted-foreground mb-6">The community you're looking for doesn't exist or has been removed.</p>
            <Button 
              onClick={() => navigate('/community')}
              className="bg-primary hover:bg-primary/90"
            >
              Go to Communities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-6 bg-background bg-grid-pattern">
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4 space-x-2 pl-1"
          onClick={() => navigate('/community')}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Communities</span>
        </Button>
        
        {/* Community Header */}
        <div className="relative mb-8">
          <div className="h-48 w-full rounded-xl overflow-hidden">
            <img 
              src={community.bannerURL || community.imageURL} 
              alt={community.name} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-background/30" />
            
            {/* Edit button for community owner */}
            {isOwner && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 bg-background/80 hover:bg-background/90"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Community
              </Button>
            )}
          </div>
          
          <div className="container max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-16 relative z-10">
              <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-background shadow-lg">
                <img 
                  src={community.imageURL} 
                  alt={community.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-grow">
                <h1 className="text-3xl font-bold text-foreground">{community.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{community.members?.length || 0} members</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">Created by {community.createdByName}</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
                {!isOwner && (
                  <>
                    {isUserMember ? (
                      <Button 
                        variant="outline"
                        onClick={handleLeaveCommunity}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button 
                        className="bg-primary hover:bg-primary/90"
                        onClick={handleJoinCommunity}
                      >
                        Join Community
                      </Button>
                    )}
                  </>
                )}
                
                <Button 
                  variant={isUserSubscribed ? "default" : "outline"}
                  onClick={handleSubscribe}
                  disabled={subscribing}
                >
                  {subscribing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : isUserSubscribed ? (
                    <BellOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  {isUserSubscribed ? 'Unsubscribe' : 'Subscribe'}
                </Button>
              </div>
            </div>
            
            <div className="mt-6 text-muted-foreground">
              <p>{community.description}</p>
            </div>
          </div>
        </div>
        
        {/* Edit Community Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px] glass-dark border-border/30 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Community</DialogTitle>
              <DialogDescription>
                Update your community information and appearance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-3">
                <Label htmlFor="community-image" className="text-sm font-medium">Community Image</Label>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-border/50 flex items-center justify-center bg-background/50">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <img src={community.imageURL} alt={community.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <Label 
                    htmlFor="community-image-upload" 
                    className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 transition-colors py-2 px-4 rounded-md text-sm"
                  >
                    Change Image
                  </Label>
                  <Input 
                    id="community-image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="edit-banner"
                  checked={editBanner}
                  onCheckedChange={setEditBanner}
                />
                <Label htmlFor="edit-banner" className="text-sm font-medium">Use Banner Image</Label>
              </div>
              
              {editBanner && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-full h-24 rounded-md overflow-hidden border-2 border-border/50 flex items-center justify-center bg-background/50">
                      {bannerPreview ? (
                        <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                      ) : community.bannerURL ? (
                        <img src={community.bannerURL} alt="Current Banner" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <Label 
                      htmlFor="community-banner-upload" 
                      className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 transition-colors py-2 px-4 rounded-md text-sm"
                    >
                      {community.bannerURL ? 'Change Banner' : 'Choose Banner'}
                    </Label>
                    <Input 
                      id="community-banner-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleBannerChange}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="community-name" className="text-sm font-medium">Community Name</Label>
                <Input 
                  id="community-name" 
                  value={editedCommunity.name}
                  onChange={(e) => setEditedCommunity(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-background/50 border-border/50"
                  placeholder="e.g., Blockchain Developers India"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="community-description" className="text-sm font-medium">Description</Label>
                <Textarea 
                  id="community-description" 
                  value={editedCommunity.description}
                  onChange={(e) => setEditedCommunity(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-background/50 border-border/50 min-h-[80px]"
                  placeholder="Tell people what your community is about..."
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/30">
              <Button 
                variant="destructive" 
                size="sm"
                className="sm:mr-auto"
                onClick={() => {
                  setShowEditDialog(false);
                  setShowDeleteDialog(true);
                }}
                disabled={updating}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Community
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  disabled={updating}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateCommunity}
                  className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : 'Save Changes'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Community Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="glass-dark border-border/30 max-w-[450px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Community
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                This action cannot be undone. This will permanently delete the 
                <span className="font-semibold"> {community?.name} </span>
                community and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={deleting} className="mt-0">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteCommunity();
                }}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : 'Delete Community'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Member Action Dialog */}
        <AlertDialog open={showMemberActionDialog} onOpenChange={setShowMemberActionDialog}>
          <AlertDialogContent className="glass-dark border-border/30 max-w-[450px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-primary" />
                Manage Member
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                {selectedMember?.role === 'moderator' ? 
                  'Choose an action for this moderator.' : 
                  'Choose an action for this member.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-md">
                <Avatar className="h-12 w-12 border border-border/30">
                  {selectedMember?.photoURL ? (
                    <AvatarImage src={selectedMember.photoURL} alt={selectedMember.name || 'Member'} />
                  ) : (
                    <AvatarFallback>{selectedMember?.name?.charAt(0) || '?'}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">{selectedMember?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedMember?.email}</p>
                  {selectedMember?.role === 'moderator' && (
                    <Badge variant="outline" className="mt-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
                      Moderator
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel disabled={processingMemberAction}>Cancel</AlertDialogCancel>
              
              {/* Show different actions based on member role */}
              {selectedMember?.role === 'moderator' ? (
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/20 hover:bg-destructive/10"
                  disabled={processingMemberAction}
                  onClick={() => handleRemoveFromModerators(selectedMember.id)}
                >
                  {processingMemberAction ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : 'Remove from Moderators'}
                </Button>
              ) : (
                <>
                  {isAdmin(community, user?.uid) && (
                    <Button
                      variant="outline"
                      className="text-amber-500 border-amber-500/20 hover:bg-amber-500/10"
                      disabled={processingMemberAction}
                      onClick={() => handlePromoteToModerator(selectedMember?.id || '')}
                    >
                      {processingMemberAction ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : 'Make Moderator'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/20 hover:bg-destructive/10"
                    disabled={processingMemberAction}
                    onClick={() => handleRemoveMember(selectedMember?.id || '')}
                  >
                    {processingMemberAction ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : 'Remove from Community'}
                  </Button>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Event Approval Dialog */}
        <AlertDialog open={showEventApprovalDialog} onOpenChange={setShowEventApprovalDialog}>
          <AlertDialogContent className="glass-dark border-border/30 max-w-[500px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <Calendar className="h-5 w-5 text-primary" />
                Review Event
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Review this event before approving or rejecting it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              {selectedEvent && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{selectedEvent.name}</h3>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{selectedEvent.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{selectedEvent.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>By {selectedEvent.createdByName}</span>
                      </div>
                      <Badge className={selectedEvent.mode === 'online' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'}>
                        {selectedEvent.mode === 'online' ? 'Online' : 'In-Person'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="rounded-md bg-secondary/30 p-4">
                    <p className="text-sm">{selectedEvent.description}</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-primary/70" />
                      <span>{selectedEvent.venue}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={processingEventAction}>Cancel</AlertDialogCancel>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => handleRejectEvent(selectedEvent?.id || '')}
                disabled={processingEventAction}
              >
                {processingEventAction ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Reject Event
                  </>
                )}
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleApproveEvent(selectedEvent?.id || '')}
                disabled={processingEventAction}
              >
                {processingEventAction ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Approve Event
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Member Profile Dialog */}
        <Dialog open={showMemberProfileDialog} onOpenChange={setShowMemberProfileDialog}>
          <DialogContent className="glass-dark border-border/30 max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <User className="h-5 w-5 text-primary" />
                Member Profile
              </DialogTitle>
              <DialogDescription className="text-base">
                Detailed profile information for this community member.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedMemberProfile && (
                <div className="space-y-6">
                  {/* Profile Header */}
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 border-2 border-primary/20 mb-4">
                      {selectedMemberProfile.photoURL ? (
                        <AvatarImage src={selectedMemberProfile.photoURL} alt={selectedMemberProfile.name || 'Member'} />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                          {selectedMemberProfile.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <h3 className="text-xl font-semibold">{selectedMemberProfile.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedMemberProfile.email}</p>
                    
                    {selectedMemberProfile.role && (
                      <Badge className={
                        selectedMemberProfile.role === 'admin' 
                          ? 'bg-primary/10 text-primary mt-2' 
                          : selectedMemberProfile.role === 'moderator'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 mt-2'
                            : 'bg-secondary mt-2'
                      }>
                        {selectedMemberProfile.role === 'admin' 
                          ? 'Admin' 
                          : selectedMemberProfile.role === 'moderator'
                            ? 'Moderator'
                            : 'Member'
                        }
                      </Badge>
                    )}
                  </div>
                  
                  {/* Bio */}
                  {selectedMemberProfile.bio && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">About</h4>
                      <div className="rounded-md bg-secondary/30 p-4">
                        <p className="text-sm">{selectedMemberProfile.bio}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {(selectedMemberProfile.linkedinUrl || selectedMemberProfile.twitterUrl || selectedMemberProfile.personalUrl) && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Social Links</h4>
                      
                      <div className="space-y-2">
                        {selectedMemberProfile.linkedinUrl && (
                          <a 
                            href={selectedMemberProfile.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:text-primary transition-colors p-2 rounded-md hover:bg-secondary/50"
                          >
                            <Linkedin className="h-4 w-4 text-[#0077b5]" />
                            <span>LinkedIn Profile</span>
                            <ExternalLink className="h-3 w-3 ml-auto opacity-70" />
                          </a>
                        )}
                        
                        {selectedMemberProfile.twitterUrl && (
                          <a 
                            href={selectedMemberProfile.twitterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:text-primary transition-colors p-2 rounded-md hover:bg-secondary/50"
                          >
                            <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                            <span>Twitter/X Profile</span>
                            <ExternalLink className="h-3 w-3 ml-auto opacity-70" />
                          </a>
                        )}
                        
                        {selectedMemberProfile.personalUrl && (
                          <a 
                            href={selectedMemberProfile.personalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:text-primary transition-colors p-2 rounded-md hover:bg-secondary/50"
                          >
                            <Globe className="h-4 w-4 text-emerald-500" />
                            <span>Personal Website</span>
                            <ExternalLink className="h-3 w-3 ml-auto opacity-70" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowMemberProfileDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            {canModerate(community, user?.uid) && pendingEvents.length > 0 && (
              <TabsTrigger value="pending-events">
                Pending Events
                <Badge variant="outline" className="ml-2 bg-amber-500/10 text-amber-500 border-amber-500/20">
                  {pendingEvents.length}
                </Badge>
              </TabsTrigger>
            )}
            {(isOwner || isUserMember) && (
              <TabsTrigger value="embed">Embed</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="calendar" className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-1/3">
                <Card className="glass-dark border-border/30">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl flex items-center">
                      <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                      {format(currentMonth, 'MMMM yyyy')}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth(new Date())}
                      >
                        Today
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <div key={`day-${index}`} className="text-center text-xs font-medium text-muted-foreground">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, index) => (
                        <div
                          key={index}
                          className={`h-9 rounded flex items-center justify-center text-sm ${
                            day.isCurrentMonth 
                              ? day.events.length > 0 
                                ? 'bg-primary/10 text-primary font-medium hover:bg-primary/20 cursor-pointer' 
                                : 'hover:bg-background/50 cursor-pointer'
                              : 'text-muted-foreground/50'
                          } ${format(day.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
                            ? 'ring-1 ring-primary' 
                            : ''}`}
                        >
                          {format(day.date, 'd')}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {(isOwner || isUserMember) && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => navigate(`/create-event?communityId=${community.id}`)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Event
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="lg:w-2/3">
                <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
                
                {events.length > 0 ? (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <Card 
                        key={event.id} 
                        className="glass-dark border-border/30 hover:border-primary/30 transition-colors overflow-hidden"
                        onClick={() => navigate(`/event/${event.id}`)}
                      >
                        <div className="flex flex-col md:flex-row cursor-pointer">
                          <div className="md:w-1/4 h-32 md:h-auto relative">
                            {event.imageURL ? (
                              <img 
                                src={event.imageURL} 
                                alt={event.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                <CalendarIcon className="h-10 w-10 text-primary/40" />
                              </div>
                            )}
                          </div>
                          
                          <div className="p-4 flex-grow">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-foreground">{event.name}</h3>
                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                  <CalendarIcon className="h-4 w-4 mr-2" />
                                  <span>{event.date} at {event.time}</span>
                                </div>
                              </div>
                              
                              <Badge className={event.mode === 'online' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'}>
                                {event.mode === 'online' ? 'Online' : 'In-Person'}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {event.description || "No description provided."}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-background/20 rounded-lg border border-border/30">
                    <h3 className="text-lg font-medium text-foreground mb-2">No events yet</h3>
                    <p className="text-muted-foreground mb-6">
                      This community hasn't created any events yet.
                    </p>
                    {(isOwner || isUserMember) && (
                      <Button
                        onClick={() => navigate(`/create-event?communityId=${community.id}`)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Event
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Upcoming Events</h2>
              {(isOwner || isUserMember) && (
                <Button
                  onClick={() => navigate(`/create-event?communityId=${community.id}`)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              )}
            </div>
            
            {events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <Card 
                    key={event.id} 
                    className="glass-dark border-border/30 hover:border-primary/30 transition-colors overflow-hidden flex flex-col"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <div className="relative h-40">
                      {event.imageURL ? (
                        <img 
                          src={event.imageURL} 
                          alt={event.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <CalendarIcon className="h-10 w-10 text-primary/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-lg font-bold text-foreground">{event.name}</h3>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          <span>{event.date} at {event.time}</span>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4 flex-grow">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description || "No description provided."}
                      </p>
                      
                      <div className="flex items-center mt-4">
                        <Badge className={event.mode === 'online' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'}>
                          {event.mode === 'online' ? 'Online' : 'In-Person'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No events yet</h3>
                <p className="text-muted-foreground mb-6">
                  This community hasn't created any events yet.
                </p>
                {(isOwner || isUserMember) && (
                  <Button
                    onClick={() => navigate(`/create-event?communityId=${community.id}`)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Event
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="members" className="space-y-4">
            <Card className="glass-dark border-border/30">
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  Community Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  members.length > 0 ? (
                    <div className="space-y-4">
                      {/* Admin (Creator) */}
                      <div className="pb-4 border-b border-border/30">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Admin</h3>
                        {members.filter(member => member.id === community?.createdBy).map(admin => (
                          <div key={admin.id} className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border/30">
                              {admin.photoURL ? (
                                <AvatarImage src={admin.photoURL} alt={admin.name || 'Admin'} />
                              ) : (
                                <AvatarFallback>{admin.name?.charAt(0) || '?'}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium">{admin.name}</p>
                              <p className="text-xs text-muted-foreground">Creator</p>
                            </div>
                            {admin.id === user?.uid && <Badge className="ml-auto bg-primary/10 text-primary">You</Badge>}
                          </div>
                        ))}
                      </div>

                      {/* Moderators */}
                      {members.filter(member => member.role === 'moderator').length > 0 && (
                        <div className="pb-4 border-b border-border/30">
                          <h3 className="text-sm font-medium text-muted-foreground mb-3">Moderators</h3>
                          <div className="space-y-3">
                            {members.filter(member => member.role === 'moderator').map(moderator => (
                              <div key={moderator.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border border-border/30">
                                    {moderator.photoURL ? (
                                      <AvatarImage src={moderator.photoURL} alt={moderator.name || 'Moderator'} />
                                    ) : (
                                      <AvatarFallback>{moderator.name?.charAt(0) || '?'}</AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{moderator.name}</p>
                                    <Badge variant="outline" className="mt-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                      Moderator
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Actions for admin */}
                                {isAdmin(community, user?.uid) && moderator.id !== user?.uid && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full hover:bg-background/80"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">Open menu</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem
                                        onClick={() => handleViewMemberProfile(moderator)}
                                        className="cursor-pointer flex items-center"
                                      >
                                        <User className="mr-2 h-4 w-4 text-primary" />
                                        <span>View Profile</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleRemoveFromModerators(moderator.id)}
                                        className="cursor-pointer flex items-center text-amber-500"
                                      >
                                        <ShieldX className="mr-2 h-4 w-4" />
                                        <span>Remove Moderator Role</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleRemoveMember(moderator.id)}
                                        className="cursor-pointer flex items-center text-destructive"
                                      >
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        <span>Remove from Community</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                
                                {moderator.id === user?.uid && <Badge className="bg-primary/10 text-primary">You</Badge>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Regular Members */}
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Members ({members.filter(member => member.role === 'member').length})
                        </h3>
                        <div className="space-y-3">
                          {members.filter(member => member.role === 'member').length > 0 ? (
                            members.filter(member => member.role === 'member').map(member => (
                              <div key={member.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border border-border/30">
                                    {member.photoURL ? (
                                      <AvatarImage src={member.photoURL} alt={member.name || 'Member'} />
                                    ) : (
                                      <AvatarFallback>{member.name?.charAt(0) || '?'}</AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">Member</p>
                                  </div>
                                </div>
                                
                                {/* Actions for admin/moderator */}
                                {canModerate(community, user?.uid) && member.id !== user?.uid && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full hover:bg-background/80"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">Open menu</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem
                                        onClick={() => handleViewMemberProfile(member)}
                                        className="cursor-pointer flex items-center"
                                      >
                                        <User className="mr-2 h-4 w-4 text-primary" />
                                        <span>View Profile</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {isAdmin(community, user?.uid) && (
                                        <DropdownMenuItem
                                          onClick={() => handlePromoteToModerator(member.id)}
                                          className="cursor-pointer flex items-center"
                                        >
                                          <ShieldCheck className="mr-2 h-4 w-4 text-amber-500" />
                                          <span>Make Moderator</span>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="cursor-pointer flex items-center text-destructive"
                                      >
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        <span>Remove Member</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                
                                {member.id === user?.uid && <Badge className="bg-primary/10 text-primary">You</Badge>}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No other members yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No members yet</h3>
                      <p className="text-muted-foreground">
                        This community doesn't have any members yet.
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Pending Events Tab */}
          {canModerate(community, user?.uid) && (
            <TabsContent value="pending-events" className="space-y-6">
              <Card className="glass-dark border-border/30">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-amber-500" />
                    Events Pending Approval
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingEvents.length > 0 ? (
                    <div className="space-y-6">
                      {pendingEvents.map((event) => (
                        <div key={event.id} className="border border-border/30 rounded-lg p-4 bg-background/30">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{event.name}</h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mt-1">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{event.date}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{event.time}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <User className="w-3.5 h-3.5" />
                                  <span>By {event.createdByName}</span>
                                </div>
                                <Badge className={event.mode === 'online' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'}>
                                  {event.mode === 'online' ? 'Online' : 'In-Person'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                          
                          <div className="flex space-x-3">
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleApproveEvent(event.id)}
                            >
                              Approve Event
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-destructive border-destructive/20 hover:bg-destructive/10"
                              onClick={() => handleRejectEvent(event.id)}
                            >
                              Reject Event
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No pending events</h3>
                      <p className="text-muted-foreground">
                        There are no events waiting for approval.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {(isOwner || isUserMember) && (
            <TabsContent value="embed" className="space-y-6">
              <Card className="glass-dark border-border/30">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Share className="mr-2 h-5 w-5 text-primary" />
                    Embed Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Embed code for adding this calendar to your website.
                  </p>
                  
                  <div className="bg-background/50 border border-border/30 rounded-md p-4 relative">
                    <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-all">
                      {embedCode}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute right-2 top-2"
                      onClick={handleCopyEmbedCode}
                    >
                      <ClipboardCopy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Preview</h3>
                    <div className="bg-background/50 border border-border/30 rounded-md p-4">
                      <div className="aspect-video bg-background/80 rounded overflow-hidden">
                        <iframe 
                          src={`/embed/community-calendar/${communityId}`}
                          title="Calendar Preview"
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default CommunityDetail; 