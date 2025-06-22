import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, Plus, Upload, CalendarPlus, Search, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, query, getDocs, where, orderBy, doc, updateDoc, arrayUnion, arrayRemove, getDoc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

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
}

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [addBanner, setAddBanner] = useState(false);
  
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchCommunities = async () => {
      setLoading(true);
      try {
        // Set up real-time listener for all communities
        const communitiesRef = collection(db, 'communities');
        const unsubscribe = onSnapshot(communitiesRef, (snapshot) => {
          const communitiesData: Community[] = [];
          const myCommunitiesData: Community[] = [];
          const joinedCommunitiesData: Community[] = [];
          
          snapshot.forEach((doc) => {
            const communityData = { id: doc.id, ...doc.data() } as Community;
            communitiesData.push(communityData);
            
            // Check if user created this community
            if (communityData.createdBy === user.uid) {
              myCommunitiesData.push(communityData);
            }
            
            // Check if user is a member of this community
            if (communityData.members && communityData.members.includes(user.uid)) {
              joinedCommunitiesData.push(communityData);
            }
          });
          
          setCommunities(communitiesData);
          setMyCommunities(myCommunitiesData);
          setJoinedCommunities(joinedCommunitiesData);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching communities:', error);
        setLoading(false);
      }
    };
    
    fetchCommunities();
  }, [user, navigate]);
  
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
  
  const handleCreateCommunity = async () => {
    if (!user) return;
    
    if (!newCommunity.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please provide a name for your community.",
        variant: "destructive",
      });
      return;
    }
    
    if (!imageFile) {
      toast({
        title: "Image Required",
        description: "Please upload an image for your community.",
        variant: "destructive",
      });
      return;
    }
    
    setCreating(true);
    try {
      // Upload image first
      const storageRef = ref(storage, `community_images/${Date.now()}_${imageFile.name}`);
      const uploadResult = await uploadBytes(storageRef, imageFile);
      const imageURL = await getDownloadURL(uploadResult.ref);
      
      // Upload banner if provided
      let bannerURL = '';
      if (addBanner && bannerFile) {
        const bannerRef = ref(storage, `community_banners/${Date.now()}_${bannerFile.name}`);
        const bannerUploadResult = await uploadBytes(bannerRef, bannerFile);
        bannerURL = await getDownloadURL(bannerUploadResult.ref);
      }
      
      // Create community document
      const communityData = {
        name: newCommunity.name,
        description: newCommunity.description,
        imageURL,
        ...(bannerURL && { bannerURL }),
        createdBy: user.uid,
        createdByName: user.displayName,
        createdAt: new Date(),
        members: [user.uid], // Creator is automatically a member
      };
      
      await addDoc(collection(db, 'communities'), communityData);
      
      // Reset form
      setNewCommunity({
        name: '',
        description: '',
      });
      setImageFile(null);
      setImagePreview(null);
      setBannerFile(null);
      setBannerPreview(null);
      setAddBanner(false);
      setShowCreateDialog(false);
      
      toast({
        title: "Community Created",
        description: "Your community has been successfully created.",
      });
    } catch (error) {
      console.error('Error creating community:', error);
      toast({
        title: "Error",
        description: "Failed to create community. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };
  
  const handleJoinCommunity = async (communityId: string) => {
    if (!user) return;
    
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
  
  const handleLeaveCommunity = async (communityId: string) => {
    if (!user) return;
    
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

  const filteredCommunities = communities.filter(community => 
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
        <Card className="glass-dark border-border/30 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Login Required</h2>
            <p className="text-muted-foreground mb-6">Please login to view communities.</p>
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading communities...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-6 bg-background bg-grid-pattern">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Communities
            </h1>
            <p className="text-muted-foreground">
              Connect with others and create events together
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Community
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-dark border-border/30">
              <DialogHeader>
                <DialogTitle>Create New Community</DialogTitle>
                <DialogDescription>
                  Create a community to organize and host events together.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="community-image">Community Image</Label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-border/50 flex items-center justify-center bg-background/50">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <Label 
                      htmlFor="community-image-upload" 
                      className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 transition-colors py-2 px-4 rounded-md text-sm"
                    >
                      Choose Image
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
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    id="add-banner"
                    checked={addBanner}
                    onCheckedChange={setAddBanner}
                  />
                  <Label htmlFor="add-banner">Add Banner Image (Optional)</Label>
                </div>
                
                {addBanner && (
                  <div className="space-y-2">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-full h-24 rounded-md overflow-hidden border-2 border-border/50 flex items-center justify-center bg-background/50">
                        {bannerPreview ? (
                          <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <Label 
                        htmlFor="community-banner-upload" 
                        className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 transition-colors py-2 px-4 rounded-md text-sm"
                      >
                        Choose Banner
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
                  <Label htmlFor="community-name">Community Name</Label>
                  <Input 
                    id="community-name" 
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-background/50 border-border/50"
                    placeholder="e.g., Blockchain Developers India"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="community-description">Description</Label>
                  <Textarea 
                    id="community-description" 
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-background/50 border-border/50 min-h-[100px]"
                    placeholder="Tell people what your community is about..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCommunity}
                  className="bg-primary hover:bg-primary/90"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : 'Create Community'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Communities</TabsTrigger>
            <TabsTrigger value="joined">Joined Communities</TabsTrigger>
            <TabsTrigger value="my">My Communities</TabsTrigger>
          </TabsList>
          
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search communities..." 
                className="pl-10 bg-background/50 border-border/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <TabsContent value="all" className="space-y-4">
            {filteredCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCommunities.map((community) => {
                  const isJoined = community.members?.includes(user.uid);
                  return (
                    <Card 
                      key={community.id} 
                      className="glass-dark border-border/30 hover:border-primary/30 transition-colors overflow-hidden flex flex-col cursor-pointer"
                      onClick={() => navigate(`/community/${community.id}`)}
                    >
                      <div className="relative h-36">
                        <img 
                          src={community.bannerURL || community.imageURL} 
                          alt={community.name} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                          <h3 className="text-lg font-bold text-foreground">{community.name}</h3>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Users className="h-3 w-3 mr-1" />
                            <span>{community.members?.length || 1}</span>
                          </div>
                        </div>
                      </div>
                      
                      <CardContent className="p-4 flex-grow">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                          {community.description || "No description provided."}
                        </p>
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback>{community.createdByName?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">Created by {community.createdByName}</span>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="p-4 pt-0">
                        {isJoined ? (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click event
                              handleLeaveCommunity(community.id);
                            }}
                          >
                            Leave Community
                          </Button>
                        ) : (
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click event
                              handleJoinCommunity(community.id);
                            }}
                          >
                            Join Community
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No communities found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery ? "No communities match your search." : "Be the first to create a community!"}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  Create a Community
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="joined" className="space-y-4">
            {joinedCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedCommunities.map((community) => (
                  <Card 
                    key={community.id} 
                    className="glass-dark border-border/30 hover:border-primary/30 transition-colors overflow-hidden flex flex-col cursor-pointer"
                    onClick={() => navigate(`/community/${community.id}`)}
                  >
                    <div className="relative h-36">
                      <img 
                        src={community.bannerURL || community.imageURL} 
                        alt={community.name} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <h3 className="text-lg font-bold text-foreground">{community.name}</h3>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          <span>{community.members?.length || 1}</span>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4 flex-grow">
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {community.description || "No description provided."}
                      </p>
                      <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback>{community.createdByName?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">Created by {community.createdByName}</span>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-4 pt-0 flex justify-between gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click event
                          handleLeaveCommunity(community.id);
                        }}
                      >
                        Leave
                      </Button>
                      <Button 
                        className="flex-1 bg-primary hover:bg-primary/90"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click event
                          navigate(`/create-event?communityId=${community.id}`);
                        }}
                      >
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        Create Event
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No joined communities</h3>
                <p className="text-muted-foreground mb-6">Join a community to see it here.</p>
                <Button onClick={() => {
                  const allTab = document.querySelector('[data-value="all"]');
                  if (allTab && allTab instanceof HTMLElement) {
                    allTab.click();
                  }
                }}>
                  Browse Communities
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="my" className="space-y-4">
            {myCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCommunities.map((community) => (
                  <Card 
                    key={community.id} 
                    className="glass-dark border-border/30 hover:border-primary/30 transition-colors overflow-hidden flex flex-col cursor-pointer"
                    onClick={() => navigate(`/community/${community.id}`)}
                  >
                    <div className="relative h-36">
                      <img 
                        src={community.bannerURL || community.imageURL} 
                        alt={community.name} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <h3 className="text-lg font-bold text-foreground">{community.name}</h3>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          <span>{community.members?.length || 1}</span>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4 flex-grow">
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {community.description || "No description provided."}
                      </p>
                      <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback>{community.createdByName?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">Created by you</span>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-4 pt-0">
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click event
                          navigate(`/create-event?communityId=${community.id}`);
                        }}
                      >
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        Create Event
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No communities created</h3>
                <p className="text-muted-foreground mb-6">Create a community to get started.</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  Create a Community
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Community; 