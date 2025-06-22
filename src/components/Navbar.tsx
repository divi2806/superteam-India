import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MapPin, Plus, User, Calendar, LogOut, History, ChevronDown, Users, CalendarDays, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/NotificationBell';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const MOBILE_BREAKPOINT = 768;

const Navbar = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobileHook = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Determine if mobile based on both the hook and direct window width
  const isMobile = windowWidth < MOBILE_BREAKPOINT;

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
    setIsMenuOpen(false);
  };

  const NavLinks = () => (
    <>
      <Button 
        variant={isActive('/') ? 'default' : 'ghost'} 
        className={`${isActive('/') 
          ? 'bg-primary hover:bg-primary/90 text-white relative overflow-hidden group transition-all duration-300' 
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 group transition-all duration-300 overflow-hidden'
        } ${isMobile ? 'w-full justify-start' : 'size-sm'}`}
        size={isMobile ? "default" : "sm"}
        onClick={(e) => handleNavigation('/', e)}
      >
        <MapPin className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
        <span className="relative z-10">Explore</span>
        {isActive('/') ? (
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
        ) : (
          <span className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></span>
        )}
      </Button>

      {user && (
        <Button 
          variant={isActive('/calendar') ? 'default' : 'ghost'}
          className={`${isActive('/calendar') 
            ? 'bg-primary hover:bg-primary/90 text-white relative overflow-hidden group transition-all duration-300' 
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 group transition-all duration-300 overflow-hidden'
          } ${isMobile ? 'w-full justify-start' : 'size-sm'}`}
          size={isMobile ? "default" : "sm"}
          onClick={(e) => handleNavigation('/calendar', e)}
        >
          <CalendarDays className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
          <span className="relative z-10">Calendar</span>
          {isActive('/calendar') ? (
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          ) : (
            <span className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></span>
          )}
        </Button>
      )}

      {user && (
        <Button 
          variant={isActive('/community') ? 'default' : 'ghost'}
          className={`${isActive('/community') 
            ? 'bg-primary hover:bg-primary/90 text-white relative overflow-hidden group transition-all duration-300' 
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 group transition-all duration-300 overflow-hidden'
          } ${isMobile ? 'w-full justify-start' : 'size-sm'}`}
          size={isMobile ? "default" : "sm"}
          onClick={(e) => handleNavigation('/community', e)}
        >
          <Users className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
          <span className="relative z-10">Communities</span>
          {isActive('/community') ? (
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          ) : (
            <span className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></span>
          )}
        </Button>
      )}

      {user && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isActive('/create-event') ? 'default' : 'ghost'}
                className={`${isActive('/create-event') 
                  ? 'bg-primary hover:bg-primary/90 text-white relative overflow-hidden group transition-all duration-300' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 group transition-all duration-300 overflow-hidden'
                } ${isMobile ? 'w-full justify-start' : 'size-sm'}`}
                size={isMobile ? "default" : "sm"}
                onClick={(e) => handleNavigation('/create-event', e)}
              >
                <Plus className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90" />
                <span className="relative z-10">Create</span>
                {isActive('/create-event') ? (
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                ) : (
                  <span className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></span>
                )}
              </Button>
            </TooltipTrigger>
            {!isMobile && (
              <TooltipContent>
                <p>Create community events</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {user && (
        <Button 
          variant={isActive('/my-events') ? 'default' : 'ghost'}
          className={`${isActive('/my-events') 
            ? 'bg-primary hover:bg-primary/90 text-white relative overflow-hidden group transition-all duration-300' 
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 group transition-all duration-300 overflow-hidden'
          } ${isMobile ? 'w-full justify-start' : 'size-sm'}`}
          size={isMobile ? "default" : "sm"}
          onClick={(e) => handleNavigation('/my-events', e)}
        >
          <Calendar className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
          <span className="relative z-10">My Events</span>
          {isActive('/my-events') ? (
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          ) : (
            <span className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></span>
          )}
        </Button>
      )}
    </>
  );

  return (
    <nav className="bg-background border-b border-border/30 px-4 sm:px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div 
          onClick={(e) => handleNavigation('/', e)} 
          className="flex items-center space-x-2 sm:space-x-3 group cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
            <img src="https://i.ibb.co/9mdV4RNZ/o-Fqnid5-X-400x400.jpg" alt="Superteam India Logo" className="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-white group-hover:text-primary/90 transition-colors duration-300 truncate">
            {isMobile ? "ST India Events" : "Superteam India Events"}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile Menu */}
          {isMobile ? (
            <>
              {user && <NotificationBell />}
              
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="hamburger-button">
                    {isMenuOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[80%] sm:w-[350px] bg-background/95 backdrop-blur-lg border-border/30">
                  <div className="flex flex-col space-y-4 mt-8">
                    <NavLinks />
                    
                    {!user ? (
                      <Button 
                        variant="default" 
                        className="bg-primary hover:bg-primary/90 text-white relative overflow-hidden group transition-all duration-300 mt-4"
                        onClick={signInWithGoogle}
                      >
                        <span className="relative z-10">Sign In</span>
                        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                      </Button>
                    ) : (
                      <div className="border-t border-border/20 pt-4 mt-4">
                        <div className="flex items-center gap-3 p-2">
                          <Avatar className="h-10 w-10 border border-border/50">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                            <AvatarFallback className="bg-primary/20 text-primary font-medium">
                              {user.displayName?.charAt(0) || user.email?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <p className="font-medium text-foreground">{user.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate w-48">{user.email}</p>
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost"
                          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary/50 mt-2"
                          onClick={(e) => handleNavigation('/profile', e)}
                        >
                          <User className="w-4 h-4 mr-2" />
                          Profile
                        </Button>
                        
                        <Button 
                          variant="ghost"
                          className="w-full justify-start text-red-500/80 hover:text-red-500 hover:bg-red-500/10 mt-2"
                          onClick={() => {
                            logout();
                            setIsMenuOpen(false);
                          }}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            /* Desktop Menu */
            <div className="flex items-center space-x-2">
              <NavLinks />
              
              {user && <NotificationBell />}
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative h-9 rounded-full hover:bg-secondary/50 ml-2 transition-all duration-300 group overflow-hidden"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border border-border/50 transition-transform duration-300 group-hover:scale-110 group-data-[state=open]:scale-110">
                          <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                          <AvatarFallback className="bg-primary/20 text-primary font-medium relative">
                            <span className="absolute inset-0 bg-primary/10 animate-pulse-subtle rounded-full opacity-0 group-hover:opacity-100"></span>
                            {user.displayName?.charAt(0) || user.email?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300 ease-in-out group-data-[state=open]:rotate-180 group-hover:text-primary/80" />
                      </div>
                      <span className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="w-60 bg-secondary/90 backdrop-blur-sm border-border/30 shadow-xl z-50" 
                    align="end"
                    sideOffset={8}
                  >
                    <div className="flex items-center justify-start gap-3 p-3 border-b border-border/20">
                      <Avatar className="h-10 w-10 border border-border/50 transition-all duration-500 hover:shadow-[0_0_12px_rgba(140,97,255,0.3)]">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                        <AvatarFallback className="bg-primary/20 text-primary font-medium">
                          {user.displayName?.charAt(0) || user.email?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="font-medium text-foreground">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate w-36">{user.email}</p>
                      </div>
                    </div>
                    <div className="p-2">
                      <DropdownMenuItem 
                        className="hover:bg-primary/10 text-muted-foreground hover:text-foreground cursor-pointer rounded-md transition-all duration-200"
                        onClick={(e) => handleNavigation('/profile', e)}
                      >
                        <User className="mr-3 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                        <span className="relative">
                          Profile
                          <span className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-primary/30 group-hover:scale-x-100 transition-transform duration-300"></span>
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="hover:bg-primary/10 text-muted-foreground hover:text-foreground cursor-pointer rounded-md transition-all duration-200"
                        onClick={(e) => handleNavigation('/calendar', e)}
                      >
                        <CalendarDays className="mr-3 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                        <span className="relative">
                          Calendar
                          <span className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-primary/30 group-hover:scale-x-100 transition-transform duration-300"></span>
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="hover:bg-primary/10 text-muted-foreground hover:text-foreground cursor-pointer rounded-md transition-all duration-200"
                        onClick={(e) => handleNavigation('/community', e)}
                      >
                        <Users className="mr-3 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                        <span className="relative">
                          Communities
                          <span className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-primary/30 group-hover:scale-x-100 transition-transform duration-300"></span>
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/20" />
                      <DropdownMenuItem 
                        className="hover:bg-red-500/10 text-muted-foreground hover:text-red-500 cursor-pointer rounded-md transition-all duration-200"
                        onClick={() => logout()}
                      >
                        <LogOut className="mr-3 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                        <span className="relative">
                          Logout
                          <span className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-red-500/30 group-hover:scale-x-100 transition-transform duration-300"></span>
                        </span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="default" 
                  className="bg-primary hover:bg-primary/90 text-white relative overflow-hidden group transition-all duration-300"
                  onClick={signInWithGoogle}
                >
                  <span className="relative z-10">Sign In</span>
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
