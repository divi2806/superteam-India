import React, { useState, useEffect } from 'react';
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ScanResultProps {
  data: {
    type: string;
    eventId: string;
    eventName: string;
    userId: string;
    userName: string;
    email: string;
    date: string;
    time: string;
    venue: string;
    status: string;
    timestamp: string;
  };
}

const ScanResult: React.FC<ScanResultProps> = ({ data }) => {
  return (
    <Card className="glass-dark border-border/30 w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
          Attendee Verified
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Event</p>
            <p className="text-base font-medium">{data.eventName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Attendee</p>
            <p className="text-base font-medium">{data.userName}</p>
            <p className="text-xs text-muted-foreground">{data.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date & Time</p>
            <p className="text-base">{data.date} at {data.time}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Venue</p>
            <p className="text-base">{data.venue}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-base font-medium text-emerald-500 capitalize">{data.status}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const QRScanner = () => {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleDecode = (result: string) => {
    try {
      const data = JSON.parse(result);
      
      // Validate the QR data
      if (data.type !== 'event-verification' || !data.eventId || !data.userId) {
        setError('Invalid QR code format. This is not a valid event ticket.');
        return;
      }
      
      setResult(data);
      setScanning(false);
      toast({
        title: 'Verification successful',
        description: `${data.userName} is verified for ${data.eventName}`,
      });
    } catch (err) {
      setError('Could not parse QR code data. Please try again.');
      console.error('QR scan error:', err);
    }
  };
  
  const handleScannerError = (err: any) => {
    console.error('Scanner error:', err);
    setError('QR scanner error. Please check camera permissions and try again.');
  };
  
  const resetScanner = () => {
    setScanning(true);
    setResult(null);
    setError(null);
  };
  
  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Event Ticket Scanner</h2>
        <p className="text-muted-foreground">Scan an event QR code to verify attendance</p>
      </div>
      
      {scanning ? (
        <div className="rounded-lg overflow-hidden">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <div className="aspect-square relative">
            <QrScanner
              onScan={(detectedCodes) => {
                if (detectedCodes.length > 0 && detectedCodes[0].rawValue) {
                  handleDecode(detectedCodes[0].rawValue);
                }
              }}
              onError={handleScannerError}
              styles={{ 
                container: { borderRadius: '0.5rem' } 
              }}
            />
            <div className="absolute inset-0 pointer-events-none border-2 border-primary/70 rounded-lg"></div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 text-center">
            Position the QR code within the scanner frame
          </p>
        </div>
      ) : result ? (
        <div className="space-y-4">
          <ScanResult data={result} />
          <Button onClick={resetScanner} className="w-full">
            Scan Another Ticket
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <p>Processing QR code...</p>
        </div>
      )}
    </div>
  );
};

export default QRScanner; 