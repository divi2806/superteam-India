import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Users, Search, Loader2, Users2, Image, X, Upload, Repeat, Check, Video, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format, addDays, addWeeks, addMonths, isBefore } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface GeocodingResult {
  place_name: string;
  center: [number, number];
}

interface Community {
  id: string;
  name: string;
  description: string;
  imageURL: string;
  createdBy: string;
  createdByName: string;
}

interface RecurringOptions {
  isRecurring: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  endDate: string;
  weeklyDay?: number; // 0 = Sunday, 1 = Monday, etc.
  monthlyDay?: number; // 1-31
  occurrences?: number; // Alternative to endDate
}

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [recurringOptions, setRecurringOptions] = useState<RecurringOptions>({
    isRecurring: false,
    frequency: 'weekly',
    endDate: format(addMonths(new Date(), 3), 'yyyy-MM-dd'), // Default end date: 3 months from now
    weeklyDay: new Date().getDay(), // Default to current day of week
    monthlyDay: new Date().getDate(), // Default to current day of month
  });
  const [useOccurrences, setUseOccurrences] = useState(false);
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [meetingLinkValid, setMeetingLinkValid] = useState<boolean | null>(null);
  const [meetingLinkType, setMeetingLinkType] = useState<'zoom' | 'google' | 'teams' | 'other' | null>(null);
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    venue: '',
    mode: '',
    date: '',
    time: '',
    coordinates: [77.2090, 28.6139] as [number, number], // Default to Delhi
    address: '',
    requireApproval: true,
    communityId: '',
    communityName: '',
    communityImageURL: '',
    imageURL: ''
  });

  useEffect(() => {
    // Check for communityId in URL params
    const params = new URLSearchParams(location.search);
    const communityId = params.get('communityId');
    
    if (communityId) {
      fetchCommunityDetails(communityId);
    }
    
    fetchUserCommunities();
  }, [location.search]);

  const fetchCommunityDetails = async (communityId: string) => {
    try {
      const communityDoc = await getDoc(doc(db, 'communities', communityId));
      if (communityDoc.exists()) {
        const communityData = { id: communityId, ...communityDoc.data() } as Community;
        setSelectedCommunity(communityData);
        setEventData(prev => ({
          ...prev,
          communityId: communityId,
          communityName: communityData.name,
          communityImageURL: communityData.imageURL
        }));
      }
    } catch (error) {
      console.error('Error fetching community details:', error);
    }
  };

  const fetchUserCommunities = async () => {
    if (!user) return;
    
    setLoadingCommunities(true);
    try {
      // Get communities where user is a member
      const communitiesQuery = query(
        collection(db, 'communities'),
        where('members', 'array-contains', user.uid)
      );
      
      const communitiesSnapshot = await getDocs(communitiesQuery);
      const communitiesData: Community[] = [];
      
      communitiesSnapshot.forEach((doc) => {
        communitiesData.push({ id: doc.id, ...doc.data() } as Community);
      });
      
      setCommunities(communitiesData);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoadingCommunities(false);
    }
  };

  // Debounce function to prevent too many API calls
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Auto-search as user types with debounce
  const handleAddressInputChange = debounce(async (value: string) => {
    if (!value || value.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearchingAddress(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?` +
        `access_token=pk.eyJ1IjoiZGl2eWFuc2gyODI0IiwiYSI6ImNtYm1rcHQyNDFleXcya29oeTl6bnJ3NWYifQ.-ESnoL4cAb0Bh6xXwfpsBw` +
        `&country=in&limit=5`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setSearchResults(data.features.map((feature: any) => ({
          place_name: feature.place_name,
          center: feature.center
        })));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching for address:', error);
      setSearchResults([]);
    } finally {
      setSearchingAddress(false);
    }
  }, 500);

  const handleAddressSearch = async () => {
    if (!eventData.address) {
      toast({
        title: "Address Required",
        description: "Please enter an address to search for coordinates.",
        variant: "destructive",
      });
      return;
    }

    setSearchingAddress(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(eventData.address)}.json?` +
        `access_token=pk.eyJ1IjoiZGl2eWFuc2gyODI0IiwiYSI6ImNtYm1rcHQyNDFleXcya29oeTl6bnJ3NWYifQ.-ESnoL4cAb0Bh6xXwfpsBw` +
        `&country=in&limit=5`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setSearchResults(data.features.map((feature: any) => ({
          place_name: feature.place_name,
          center: feature.center
        })));
      } else {
        toast({
          title: "No Results Found",
          description: "No locations found for this address. Try with a more specific address.",
          variant: "destructive",
        });
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching for address:', error);
      toast({
        title: "Error",
        description: "Failed to search for address. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearchingAddress(false);
    }
  };

  const selectLocation = (result: GeocodingResult) => {
    setEventData(prev => ({
      ...prev,
      coordinates: result.center,
      venue: result.place_name,
      address: result.place_name
    }));
    setSearchResults([]);
  };

  const handleCommunityChange = (communityId: string) => {
    const community = communities.find(c => c.id === communityId);
    if (community) {
      setSelectedCommunity(community);
      setEventData(prev => ({
        ...prev,
        communityId: community.id,
        communityName: community.name,
        communityImageURL: community.imageURL
      }));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Only image files are allowed.",
        variant: "destructive",
      });
      return;
    }
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setEventData(prev => ({ ...prev, imageURL: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to generate recurring event dates
  const generateRecurringDates = (startDate: string, options: RecurringOptions): string[] => {
    const dates: string[] = [startDate];
    const start = new Date(startDate);
    let currentDate = start;
    
    // Determine end condition
    const endDate = options.endDate ? new Date(options.endDate) : null;
    const maxOccurrences = options.occurrences || 100; // Reasonable upper limit
    
    // Generate dates based on frequency
    while (dates.length < maxOccurrences) {
      let nextDate: Date;
      
      switch (options.frequency) {
        case 'daily':
          nextDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          nextDate = addMonths(currentDate, 1);
          // Adjust for months with fewer days
          if (options.monthlyDay && options.monthlyDay > 28) {
            // If the desired day exceeds the days in the month, use the last day
            const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
            nextDate.setDate(Math.min(options.monthlyDay, lastDayOfMonth));
          }
          break;
        default:
          nextDate = addWeeks(currentDate, 1);
      }
      
      // End date check
      if (endDate && isBefore(endDate, nextDate)) {
        break;
      }
      
      // Max occurrences check
      if (useOccurrences && dates.length >= options.occurrences!) {
        break;
      }
      
      dates.push(format(nextDate, 'yyyy-MM-dd'));
      currentDate = nextDate;
    }
    
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create an event.",
        variant: "destructive",
      });
      return;
    }
    
    if (!eventData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please provide a name for your event.",
        variant: "destructive",
      });
      return;
    }
    
    if (!eventData.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a description for your event.",
        variant: "destructive",
      });
      return;
    }
    
    if (!eventData.date) {
      toast({
        title: "Date Required",
        description: "Please select a date for your event.",
        variant: "destructive",
      });
      return;
    }
    
    if (!eventData.time) {
      toast({
        title: "Time Required",
        description: "Please select a time for your event.",
        variant: "destructive",
      });
      return;
    }
    
    if (!eventData.mode) {
      toast({
        title: "Mode Required",
        description: "Please select whether this is an online or offline event.",
        variant: "destructive",
      });
      return;
    }
    
    if (eventData.mode === 'offline' && !eventData.venue) {
      toast({
        title: "Venue Required",
        description: "Please provide a venue for your offline event.",
        variant: "destructive",
      });
      return;
    }
    
    if (eventData.mode === 'online' && !eventData.venue) {
      toast({
        title: "Meeting Link Required",
        description: "Please provide a meeting link for your online event.",
        variant: "destructive",
      });
      return;
    }
    
    if (eventData.communityId && !selectedCommunity) {
      toast({
        title: "Community Error",
        description: "There was an error with the selected community. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Upload image if provided
      let imageURL = '';
      if (imageFile) {
        setUploadingImage(true);
        const storageRef = ref(storage, `event_images/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        imageURL = await getDownloadURL(uploadResult.ref);
        setUploadingImage(false);
      }
      
      // Check if user is admin or moderator of the community
      let isPendingApproval = true;
      if (eventData.communityId && selectedCommunity) {
        // If user is the community creator (admin), no approval needed
        if (selectedCommunity.createdBy === user.uid) {
          isPendingApproval = false;
        } else {
          // Check if user is a moderator
          try {
            const communityDoc = await getDoc(doc(db, 'communities', eventData.communityId));
            if (communityDoc.exists()) {
              const communityData = communityDoc.data();
              if (communityData.moderators && communityData.moderators.includes(user.uid)) {
                isPendingApproval = false;
              }
            }
          } catch (error) {
            console.error('Error checking moderator status:', error);
          }
        }
      }
      
      const eventBaseData = {
        name: eventData.name,
        description: eventData.description,
        venue: eventData.venue,
        mode: eventData.mode,
        date: eventData.date,
        time: eventData.time,
        createdBy: user.uid,
        createdByName: user.displayName,
        createdAt: new Date(),
        ...(imageURL && { imageURL }),
        ...(eventData.mode === 'offline' && { coordinates: eventData.coordinates }),
        ...(eventData.communityId && { 
          communityId: eventData.communityId,
          communityName: eventData.communityName,
          communityImageURL: eventData.communityImageURL,
          pendingApproval: isPendingApproval
        }),
      };

      // Handle recurring events
      if (recurringOptions.isRecurring) {
        const recurringDates = generateRecurringDates(eventData.date, recurringOptions);
        
        // Create the main event (the first occurrence)
        const mainEventDocRef = await addDoc(collection(db, 'events'), {
          ...eventBaseData,
          registrations: [],
          pendingRegistrations: [],
          hasNotifications: false,
          notifications: [],
          isRecurring: true,
          recurringOptions: {
            ...recurringOptions,
            dates: recurringDates,
            parentEventId: null // Will update this after creation
          }
        });
        
        // Update the parent event ID to itself
        await updateDoc(mainEventDocRef, {
          'recurringOptions.parentEventId': mainEventDocRef.id
        });
        
        // Check for existing approved registrations from previous recurring events by the same organizer
        let autoRegistrations: any[] = [];
        
        try {
          // Find previous recurring events created by the same organizer
          const previousRecurringEventsQuery = query(
            collection(db, 'events'),
            where('createdBy', '==', user.uid),
            where('isRecurring', '==', true)
          );
          
          const previousEventsSnapshot = await getDocs(previousRecurringEventsQuery);
          const allPreviousRegistrations = new Set<string>();
          
          // Collect all users who have been approved for previous recurring events by this organizer
          previousEventsSnapshot.forEach((doc) => {
            const eventData = doc.data();
            if (eventData.registrations) {
              eventData.registrations.forEach((reg: any) => {
                if (reg.status === 'approved' && reg.userId !== user.uid) {
                  allPreviousRegistrations.add(reg.userId);
                }
              });
            }
          });
          
          // If we found previous approved users, prepare auto-registrations
          if (allPreviousRegistrations.size > 0) {
            // Get user details for auto-registration
            const autoRegPromises = Array.from(allPreviousRegistrations).map(async (userId) => {
              try {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  return {
                    userId: userId,
                    name: userData.name || userData.displayName || 'Unknown User',
                    email: userData.email || '',
                    reason: 'Auto-registered from previous recurring event participation',
                    date: new Date().toISOString(),
                    status: 'approved' // Auto-approve returning participants
                  };
                }
              } catch (error) {
                console.error('Error fetching user data for auto-registration:', error);
              }
              return null;
            });
            
            const resolvedAutoRegs = await Promise.all(autoRegPromises);
            autoRegistrations = resolvedAutoRegs.filter(reg => reg !== null);
          }
        } catch (error) {
          console.error('Error setting up auto-registrations:', error);
          // Continue with normal event creation even if auto-registration setup fails
        }

        // Create child events (future occurrences)
        const childEventPromises = recurringDates.slice(1).map(async (date, index) => {
          await addDoc(collection(db, 'events'), {
            ...eventBaseData,
            date,
            registrations: eventData.requireApproval ? [] : autoRegistrations, // Auto-register only if no approval required
            pendingRegistrations: eventData.requireApproval ? autoRegistrations : [], // Add to pending if approval required
            hasNotifications: false,
            notifications: [],
            isRecurringChild: true,
            recurringOptions: {
              parentEventId: mainEventDocRef.id,
              occurrenceNumber: index + 2 // 1-based, first one is the parent
            }
          });
        });
        
        // Also update the main event with auto-registrations
        if (autoRegistrations.length > 0) {
          await updateDoc(mainEventDocRef, {
            registrations: eventData.requireApproval ? [] : autoRegistrations,
            pendingRegistrations: eventData.requireApproval ? autoRegistrations : []
          });
        }
        
        await Promise.all(childEventPromises);
        
        toast({
          title: "Recurring Event Created!",
          description: `Created ${recurringDates.length} event occurrences.${autoRegistrations.length > 0 ? ` Auto-registered ${autoRegistrations.length} returning participants.` : ''}`,
        });
      } else {
        // Create a single event (non-recurring)
        await addDoc(collection(db, 'events'), {
          ...eventBaseData,
          registrations: [],
          pendingRegistrations: [],
          hasNotifications: false,
          notifications: []
        });
        
        toast({
          title: "Event Created",
          description: isPendingApproval 
            ? "Your event has been submitted and is pending approval from community moderators."
            : "Your event has been successfully created.",
        });
      }

      // If this is a community event, handle community member notifications
      if (eventData.communityId) {
        try {
          // Get the community document to check members
          const communityDoc = await getDoc(doc(db, 'communities', eventData.communityId));
          if (communityDoc.exists()) {
            const communityData = communityDoc.data();
            const communityMembers = communityData.members || [];
            
            // No need to send notification to the event creator
            const membersToNotify = communityMembers.filter(memberId => memberId !== user.uid);
            
            if (membersToNotify.length > 0) {
              console.log(`Created event for community ${eventData.communityName}, notifying ${membersToNotify.length} members`);
              // The notification system automatically handles community event notifications
              // by checking community membership in the NotificationBell component
            }
          }
        } catch (error) {
          console.error('Error handling community notifications:', error);
          // Continue with event creation even if notification process fails
        }
      }

      // Redirect to community page if created from community, otherwise to my events
      if (eventData.communityId) {
        navigate(`/community/${eventData.communityId}`);
      } else {
        navigate('/my-events');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to validate meeting link
  const validateMeetingLink = (link: string) => {
    if (!link) {
      setMeetingLinkValid(null);
      setMeetingLinkType(null);
      return;
    }

    try {
      const url = new URL(link);
      
      // Check if it's a valid URL
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        setMeetingLinkValid(false);
        setMeetingLinkType(null);
        return;
      }
      
      // Identify meeting platform
      if (url.hostname.includes('zoom.')) {
        setMeetingLinkType('zoom');
      } else if (url.hostname.includes('meet.google.')) {
        setMeetingLinkType('google');
      } else if (url.hostname.includes('teams.microsoft.')) {
        setMeetingLinkType('teams');
      } else {
        setMeetingLinkType('other');
      }
      
      setMeetingLinkValid(true);
    } catch (e) {
      setMeetingLinkValid(false);
      setMeetingLinkType(null);
    }
  };

  // Handle meeting link change
  const handleMeetingLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEventData(prev => ({ ...prev, venue: value }));
    validateMeetingLink(value);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
        <Card className="glass-dark max-w-md w-full border-border/30">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Login Required</h2>
            <p className="text-muted-foreground mb-6">Please login to create an event.</p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-primary hover:bg-primary/90"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background bg-grid-pattern">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3 text-foreground">
            Create New Event
          </h1>
          <p className="text-muted-foreground">
            {selectedCommunity 
              ? `Creating event for ${selectedCommunity.name} community` 
              : 'Share your event with the community'}
          </p>
        </div>

        <Card className="glass-dark border-border/30">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Event Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Community Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                  <Users2 className="w-4 h-4" />
                  <span>Community</span>
                  <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4 bg-primary/10 text-primary border-primary/20">Required</Badge>
                </label>
                <Select
                  value={eventData.communityId}
                  onValueChange={handleCommunityChange}
                  disabled={loadingCommunities}
                  required
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Select a community" />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border/30">
                    {communities.map((community) => (
                      <SelectItem key={community.id} value={community.id}>
                        {community.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {communities.length === 0 && !loadingCommunities && (
                  <div className="rounded-md bg-amber-500/10 p-3 mt-2 border border-amber-500/20">
                    <div className="flex items-start">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-amber-500">You need to join a community first</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Visit the <a href="/community" className="text-primary hover:underline">Communities</a> tab to join or create a community before creating an event.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {loadingCommunities && (
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading communities...</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Event Name</label>
                  <Input
                    placeholder="Enter event name"
                    value={eventData.name}
                    onChange={(e) => setEventData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-background/50 border-border/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Mode</label>
                  <Select
                    value={eventData.mode}
                    onValueChange={(value) => setEventData(prev => ({ ...prev, mode: value }))}
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                  </label>
                  <DatePicker
                    date={eventData.date ? new Date(eventData.date) : undefined}
                    setDate={(date) => date && setEventData(prev => ({ 
                      ...prev, 
                      date: date.toISOString().split('T')[0]
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Time</span>
                  </label>
                  <TimePicker
                    time={eventData.time}
                    setTime={(time) => setEventData(prev => ({ ...prev, time }))}
                  />
                </div>
              </div>

              {eventData.mode === 'online' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                    <Video className="w-4 h-4" />
                    <span>Meeting Link</span>
                  </label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        placeholder="Enter meeting link (e.g., https://zoom.us/j/123456789, https://meet.google.com/abc-defg-hij)"
                        value={eventData.venue}
                        onChange={handleMeetingLinkChange}
                        className={`bg-background/50 border-border/50 pr-10 ${
                          meetingLinkValid === false ? 'border-destructive focus-visible:ring-destructive/20' : 
                          meetingLinkValid === true ? 'border-emerald-500 focus-visible:ring-emerald-500/20' : ''
                        }`}
                        required
                      />
                      {meetingLinkValid !== null && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {meetingLinkValid ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {meetingLinkType && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                          {meetingLinkType === 'zoom' && 'Zoom Meeting'}
                          {meetingLinkType === 'google' && 'Google Meet'}
                          {meetingLinkType === 'teams' && 'Microsoft Teams'}
                          {meetingLinkType === 'other' && 'Online Meeting'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Detected meeting platform</span>
                      </div>
                    )}
                    
                    {meetingLinkValid === false && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Please enter a valid meeting URL (e.g., https://zoom.us/j/123456789)
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Info className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span>This link will only be visible to approved participants</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Event Location</span>
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="flex space-x-2">
                        <div className="relative w-full flex-grow">
                          <Input
                            placeholder="Search for an address or place"
                            value={eventData.address}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEventData(prev => ({ ...prev, address: value }));
                              handleAddressInputChange(value);
                            }}
                            className="bg-background/50 border-border/50 w-full pr-8"
                          />
                          {searchingAddress && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <Button 
                          type="button" 
                          onClick={handleAddressSearch}
                          disabled={searchingAddress}
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                        >
                          {searchingAddress ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {searchResults.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-secondary/70 backdrop-blur-sm border border-border/30 rounded-md overflow-hidden shadow-lg">
                          <div className="max-h-48 overflow-auto">
                            {searchResults.map((result, index) => (
                              <div 
                                key={index}
                                className="p-3 hover:bg-secondary/90 cursor-pointer text-sm border-b border-border/10 last:border-b-0 transition-colors duration-150"
                                onClick={() => selectLocation(result)}
                              >
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-foreground font-medium">{result.place_name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {result.center[0].toFixed(6)}, {result.center[1].toFixed(6)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {eventData.venue && (
                      <div className="p-3 bg-secondary/20 rounded-md border border-border/20">
                        <h4 className="text-sm font-medium text-foreground mb-1">Selected Location:</h4>
                        <p className="text-sm text-muted-foreground">{eventData.venue}</p>
                        <div className="flex text-xs text-muted-foreground mt-2">
                          <span className="mr-2">Coordinates:</span>
                          <span>{eventData.coordinates[0].toFixed(6)}, {eventData.coordinates[1].toFixed(6)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image upload section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                  <Image className="w-4 h-4" />
                  <span>Event Image (Optional)</span>
                </label>
                
                {imagePreview ? (
                  <div className="relative rounded-md overflow-hidden border border-border/50 h-48">
                    <img 
                      src={imagePreview} 
                      alt="Event preview" 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-border/50 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload an event image</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 5MB</p>
                  </div>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <Textarea
                  placeholder="Describe your event..."
                  value={eventData.description}
                  onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-background/50 border-border/50"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireApproval"
                    checked={eventData.requireApproval}
                    onChange={(e) => setEventData(prev => ({ ...prev, requireApproval: e.target.checked }))}
                    className="rounded border-border/50 bg-background/50 text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="requireApproval" className="text-sm font-medium text-muted-foreground">
                    Require approval for registrations
                  </label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  If checked, you'll need to approve participants before they can join your event.
                </p>
              </div>

              {/* Add recurring event options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Repeat className="w-4 h-4 text-muted-foreground" />
                    <label className="text-sm font-medium text-muted-foreground">Recurring Event</label>
                  </div>
                  <Switch
                    checked={recurringOptions.isRecurring}
                    onCheckedChange={(checked) => {
                      setRecurringOptions(prev => ({ ...prev, isRecurring: checked }));
                      setShowRecurringOptions(checked);
                    }}
                  />
                </div>
                
                {showRecurringOptions && (
                  <div className="bg-secondary/20 rounded-md border border-border/20 p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Frequency</label>
                      <RadioGroup 
                        value={recurringOptions.frequency} 
                        onValueChange={(value) => setRecurringOptions(prev => ({ 
                          ...prev, 
                          frequency: value as 'daily' | 'weekly' | 'monthly' 
                        }))}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="daily" id="daily" />
                          <Label htmlFor="daily">Daily</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekly" id="weekly" />
                          <Label htmlFor="weekly">Weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="monthly" id="monthly" />
                          <Label htmlFor="monthly">Monthly</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    {recurringOptions.frequency === 'weekly' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Day of Week</label>
                        <Select
                          value={recurringOptions.weeklyDay?.toString()}
                          onValueChange={(value) => setRecurringOptions(prev => ({ 
                            ...prev, 
                            weeklyDay: parseInt(value) 
                          }))}
                        >
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent className="bg-secondary border-border/30">
                            <SelectItem value="0">Sunday</SelectItem>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {recurringOptions.frequency === 'monthly' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Day of Month</label>
                        <Select
                          value={recurringOptions.monthlyDay?.toString()}
                          onValueChange={(value) => setRecurringOptions(prev => ({ 
                            ...prev, 
                            monthlyDay: parseInt(value) 
                          }))}
                        >
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent className="bg-secondary border-border/30 h-60">
                            {Array.from({ length: 31 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="use-occurrences" 
                          checked={useOccurrences}
                          onCheckedChange={(checked) => setUseOccurrences(checked === true)}
                        />
                        <label htmlFor="use-occurrences" className="text-sm font-medium text-muted-foreground">
                          Limit by number of occurrences
                        </label>
                      </div>
                      
                      {useOccurrences ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Number of Occurrences</label>
                          <Input
                            type="number"
                            min="2"
                            max="52"
                            value={recurringOptions.occurrences || 10}
                            onChange={(e) => setRecurringOptions(prev => ({ 
                              ...prev, 
                              occurrences: parseInt(e.target.value) 
                            }))}
                            className="bg-background/50 border-border/50 w-full"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">End Date</label>
                          <DatePicker
                            date={recurringOptions.endDate ? new Date(recurringOptions.endDate) : undefined}
                            setDate={(date) => date && setRecurringOptions(prev => ({ 
                              ...prev, 
                              endDate: format(date, 'yyyy-MM-dd')
                            }))}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-primary/10 rounded-md p-3 text-sm">
                      <div className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-foreground font-medium">Recurring Event Info</p>
                          <p className="text-muted-foreground mt-1">
                            This will create multiple events based on your recurrence settings. 
                            Only the first occurrence will be shown on the map, but all occurrences 
                            will appear in the calendar view.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || uploadingImage}
                className="w-full bg-primary hover:bg-primary/90 h-10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadingImage ? 'Uploading Image...' : recurringOptions.isRecurring ? 'Creating Recurring Events...' : 'Creating Event...'}
                  </>
                ) : (
                  recurringOptions.isRecurring ? 'Create Recurring Events' : 'Create Event'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateEvent;
