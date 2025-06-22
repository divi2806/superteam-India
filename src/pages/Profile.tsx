import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { User, Calendar, MapPin, Loader2, Edit, Camera, AlertCircle, Linkedin, Twitter, Globe } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, storage, auth } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile, updateEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface Event {
  id: string;
  name: string;
  venue: string;
  mode: 'online' | 'offline';
  description: string;
  date: string;
  time: string;
  isFull?: boolean;
}

interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  personalUrl?: string;
  bio?: string;
}

const Profile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile>({
    displayName: '',
    email: '',
    photoURL: '',
    linkedinUrl: '',
    twitterUrl: '',
    personalUrl: '',
    bio: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchUserProfile = async () => {
      try {
        // Check if user has a profile document
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfileData({
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            linkedinUrl: userData.linkedinUrl || '',
            twitterUrl: userData.twitterUrl || '',
            personalUrl: userData.personalUrl || '',
            bio: userData.bio || ''
          });
        } else {
          setProfileData({
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            linkedinUrl: '',
            twitterUrl: '',
            personalUrl: '',
            bio: ''
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setProfileData({
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          linkedinUrl: '',
          twitterUrl: '',
          personalUrl: '',
          bio: ''
        });
      }
    };

    fetchUserProfile();

    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch user's events
        const eventsQuery = query(
          collection(db, 'events'),
          where('createdBy', '==', user.uid)
        );
        
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData: Event[] = [];
        eventsSnapshot.forEach((doc) => {
          eventsData.push({ id: doc.id, ...doc.data() } as Event);
        });
        
        setUserEvents(eventsData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileData(prev => ({
            ...prev,
            photoURL: event.target!.result as string
          }));
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser || !user) return;
    
    setSaving(true);
    try {
      let photoURL = user?.photoURL || '';
      
      // Upload new image if one was selected
      if (imageFile) {
        const storageRef = ref(storage, `profile_pictures/${user?.uid}/${imageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(uploadResult.ref);
      }
      
      // Update profile info in Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: profileData.displayName,
        photoURL: photoURL
      });
      
      // Update email if changed
      if (profileData.email !== user?.email) {
        await updateEmail(auth.currentUser, profileData.email);
      }
      
      // Save additional profile data to Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: profileData.displayName,
        email: profileData.email,
        photoURL: photoURL,
        linkedinUrl: profileData.linkedinUrl || '',
        twitterUrl: profileData.twitterUrl || '',
        personalUrl: profileData.personalUrl || '',
        bio: profileData.bio || '',
        updatedAt: new Date()
      }).catch(async (error) => {
        // If document doesn't exist, create it
        if (error.code === 'not-found') {
          await setDoc(userDocRef, {
            name: profileData.displayName,
            email: profileData.email,
            photoURL: photoURL,
            linkedinUrl: profileData.linkedinUrl || '',
            twitterUrl: profileData.twitterUrl || '',
            personalUrl: profileData.personalUrl || '',
            bio: profileData.bio || '',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          throw error;
        }
      });
      
      // Update local user state
      setUser({
        ...auth.currentUser,
        displayName: profileData.displayName,
        photoURL: photoURL,
        email: profileData.email
      });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background bg-grid-pattern">
        <Card className="glass-dark border-border/30 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className={`font-bold text-foreground mb-4 ${isMobile ? 'text-xl' : 'text-2xl'}`}>Login Required</h2>
            <p className={`text-muted-foreground ${isMobile ? 'mb-4' : 'mb-6'}`}>Please login to view your profile.</p>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background bg-grid-pattern">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-4 sm:p-6 bg-background bg-grid-pattern">
      <div className={`mx-auto ${isMobile ? 'max-w-full' : 'max-w-4xl'}`}>
        <div className={isMobile ? 'mb-6' : 'mb-8'}>
          <h1 className={`font-bold text-foreground ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            Profile
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
            Manage your personal information and event preferences
          </p>
        </div>

        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Profile Card */}
          <div className={isMobile ? '' : 'lg:col-span-1'}>
            <Card className="glass-dark border-border/30 h-full">
              <CardHeader className={isMobile ? 'p-4 pb-2' : ''}>
                <CardTitle className={`text-foreground flex items-center justify-between ${isMobile ? 'text-lg' : 'text-xl'}`}>
                  <span>User Profile</span>
                  {!isEditing && (
                    <Button 
                      onClick={() => setIsEditing(true)} 
                      variant="ghost" 
                      size="icon"
                      className={`text-muted-foreground hover:text-foreground ${isMobile ? 'h-7 w-7' : 'h-8 w-8'}`}
                    >
                      <Edit className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className={isMobile ? 'pt-4 px-4' : 'pt-6'}>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <Avatar className={`border-2 border-primary/20 ${isMobile ? 'h-20 w-20' : 'h-24 w-24'}`}>
                          <AvatarImage src={profileData.photoURL || ''} alt={profileData.displayName} />
                          <AvatarFallback className={`bg-primary/10 text-primary ${isMobile ? 'text-lg' : 'text-xl'}`}>
                            {profileData.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <label 
                          htmlFor="avatar-upload" 
                          className={`absolute bottom-0 right-0 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors ${isMobile ? 'h-7 w-7' : 'h-8 w-8'}`}
                        >
                          <Camera className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                          <input 
                            id="avatar-upload" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={profileData.displayName}
                          onChange={(e) => setProfileData({...profileData, displayName: e.target.value})}
                          className="bg-background/50"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          className="bg-background/50"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Input
                          id="bio"
                          value={profileData.bio || ''}
                          onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                          className="bg-background/50"
                          placeholder="Tell us about yourself"
                        />
                      </div>
                      
                      <div className="pt-4 border-t border-border/30">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Social Links</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <Linkedin className="h-4 w-4 text-[#0077b5] mr-2" />
                            <Input
                              id="linkedinUrl"
                              value={profileData.linkedinUrl || ''}
                              onChange={(e) => setProfileData({...profileData, linkedinUrl: e.target.value})}
                              className="bg-background/50"
                              placeholder="LinkedIn URL"
                            />
                          </div>
                          
                          <div className="flex items-center">
                            <Twitter className="h-4 w-4 text-[#1DA1F2] mr-2" />
                            <Input
                              id="twitterUrl"
                              value={profileData.twitterUrl || ''}
                              onChange={(e) => setProfileData({...profileData, twitterUrl: e.target.value})}
                              className="bg-background/50"
                              placeholder="Twitter/X URL"
                            />
                          </div>
                          
                          <div className="flex items-center">
                            <Globe className="h-4 w-4 text-emerald-500 mr-2" />
                            <Input
                              id="personalUrl"
                              value={profileData.personalUrl || ''}
                              onChange={(e) => setProfileData({...profileData, personalUrl: e.target.value})}
                              className="bg-background/50"
                              placeholder="Personal Website URL"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Avatar className="h-24 w-24 mx-auto border-2 border-primary/20">
                      <AvatarImage src={profileData.photoURL || ''} alt={profileData.displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {profileData.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h2 className="mt-4 text-xl font-semibold text-foreground">{profileData.displayName}</h2>
                    <p className="text-muted-foreground">{profileData.email}</p>
                    
                    {profileData.bio && (
                      <p className="mt-4 text-sm text-muted-foreground">{profileData.bio}</p>
                    )}
                    
                    {(profileData.linkedinUrl || profileData.twitterUrl || profileData.personalUrl) && (
                      <div className="mt-6 flex justify-center space-x-4">
                        {profileData.linkedinUrl && (
                          <a 
                            href={profileData.linkedinUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#0077b5] hover:text-[#0077b5]/80 transition-colors"
                          >
                            <Linkedin className="h-5 w-5" />
                            <span className="sr-only">LinkedIn</span>
                          </a>
                        )}
                        
                        {profileData.twitterUrl && (
                          <a 
                            href={profileData.twitterUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#1DA1F2] hover:text-[#1DA1F2]/80 transition-colors"
                          >
                            <Twitter className="h-5 w-5" />
                            <span className="sr-only">Twitter/X</span>
                          </a>
                        )}
                        
                        {profileData.personalUrl && (
                          <a 
                            href={profileData.personalUrl} 
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
                )}
              </CardContent>
              {isEditing && (
                <CardFooter className={`pt-2 ${isMobile ? 'flex-col space-y-2 px-4 pb-4' : 'flex justify-between px-6 pb-6'}`}>
                  <Button 
                    onClick={() => {
                      setIsEditing(false);
                      setProfileData({
                        displayName: user.displayName || '',
                        email: user.email || '',
                        photoURL: user.photoURL || '',
                        linkedinUrl: '',
                        twitterUrl: '',
                        personalUrl: '',
                        bio: ''
                      });
                      setImageFile(null);
                    }}
                    variant="outline"
                    disabled={saving}
                    className={isMobile ? 'w-full' : ''}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveProfile}
                    className={`bg-primary hover:bg-primary/90 ${isMobile ? 'w-full' : ''}`}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </Button>
                </CardFooter>
              )}
              {!isEditing && (
                <CardFooter className={`pt-2 ${isMobile ? 'px-4 pb-4' : 'px-6 pb-6'}`}>
                  <Button 
                    onClick={() => navigate('/create-event')} 
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                  >
                    Create New Event
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
          
          {/* Events section */}
          <div className={isMobile ? '' : 'lg:col-span-2'}>
            <Card className="glass-dark border-border/30">
              <CardHeader className={`flex flex-row items-center justify-between ${isMobile ? 'p-4 pb-2' : 'pb-3'}`}>
                <CardTitle className={`text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>My Events</CardTitle>
                <Button 
                  onClick={() => navigate('/my-events')} 
                  variant="ghost"
                  size="sm"
                  className={`text-primary hover:text-primary hover:bg-primary/10 ${isMobile ? 'text-xs' : 'text-xs'}`}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className={`space-y-3 ${isMobile ? 'px-4' : ''}`}>
                {userEvents.length > 0 ? (
                                      userEvents.slice(0, 3).map(event => (
                      <div 
                        key={event.id} 
                        className={`group rounded-lg glass-dark border border-border/30 hover:border-primary/30 transition-all duration-200 cursor-pointer ${isMobile ? 'p-2' : 'p-3'}`}
                        onClick={() => navigate(`/event/${event.id}`)}
                      >
                        <div className={`${isMobile ? 'space-y-2' : 'flex justify-between items-start'}`}>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium text-foreground truncate group-hover:text-primary transition-colors ${isMobile ? 'text-sm' : 'text-base'}`}>{event.name}</h3>
                            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${isMobile ? 'mt-1' : 'mt-1.5'}`}>
                              <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 text-primary/70" />
                                <span>{event.date}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 text-primary/70" />
                                <span className={`truncate ${isMobile ? 'max-w-[100px]' : 'max-w-[150px]'}`}>{event.venue}</span>
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={event.mode === 'online' ? 'secondary' : 'outline'} 
                            className={`shrink-0 ${isMobile ? 'w-fit' : 'ml-2'} ${
                              event.mode === 'online' 
                                ? 'bg-primary/10 text-primary text-xs py-0 px-1.5' 
                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs py-0 px-1.5'
                            }`}
                          >
                            {event.mode === 'online' ? 'Online' : 'In-Person'}
                          </Badge>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-10 bg-secondary/10 rounded-lg border border-border/20">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No events created yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">Create your first event to get started</p>
                    <Button 
                      onClick={() => navigate('/create-event')}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Create an Event
                    </Button>
                  </div>
                )}
                
                {userEvents.length > 0 && (
                  <div className="pt-2">
                    <Button 
                      onClick={() => navigate('/my-events')} 
                      variant="outline"
                      className="w-full text-sm bg-secondary/50 hover:bg-secondary/70 border-border/30"
                    >
                      View All Events
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;