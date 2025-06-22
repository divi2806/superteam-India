import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import SEO from '@/components/SEO';

const ScanTicket = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // If not logged in, redirect to home
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    navigate('/');
    return null;
  }
  
  return (
    <div className="min-h-screen p-6 bg-background bg-grid-pattern">
      <SEO 
        title="Scan Event Tickets"
        description="Scan and verify event tickets for Superteam India Events."
        keywords="event tickets, ticket scanner, QR code scanner, event verification"
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Ticket Scanner
          </h1>
          <p className="text-muted-foreground">
            Scan QR codes to verify event attendees
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="glass-dark border-border/30 h-full">
              <CardContent className="p-6">
                <QRScanner />
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="glass-dark border-border/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">Scanner Instructions</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Hold the camera up to the attendee's QR code</p>
                  <p>2. Wait for the system to verify the ticket</p>
                  <p>3. Check the status and details displayed</p>
                  <p>4. Click "Scan Another" to continue</p>
                </div>
                
                <div className="mt-6 pt-6 border-t border-border/20">
                  <h4 className="text-base font-medium mb-2">Tips</h4>
                  <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground">
                    <li>Make sure the QR code is well-lit and in focus</li>
                    <li>The QR code should be completely visible in the frame</li>
                    <li>Hold steady for best results</li>
                  </ul>
                </div>
                
                <div className="mt-6">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/my-events')}
                  >
                    Back to My Events
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanTicket; 