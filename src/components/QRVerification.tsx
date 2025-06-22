import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QRVerificationProps {
  event: {
    id: string;
    name: string;
    date: string;
    time: string;
    venue: string;
  };
  user: {
    uid?: string;
    displayName?: string | null;
    email?: string | null;
  } | null;
  size?: number;
}

const QRVerification: React.FC<QRVerificationProps> = ({
  event,
  user,
  size = 150
}) => {
  if (!user || !event) return null;
  
  const qrData = {
    type: "event-verification",
    eventId: event.id,
    eventName: event.name,
    userId: user.uid,
    userName: user.displayName,
    email: user.email,
    date: event.date,
    time: event.time,
    venue: event.venue,
    status: "approved",
    timestamp: new Date().toISOString()
  };
  
  const qrString = JSON.stringify(qrData);
  
  // Function to copy QR data to clipboard
  const copyQRData = () => {
    navigator.clipboard.writeText(qrString);
    toast({
      title: 'Copied to clipboard',
      description: 'QR verification data has been copied to clipboard',
    });
  };
  
  // Function to download QR code as SVG
  const downloadQRCode = () => {
    const svg = document.getElementById('event-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${event.name.replace(/\s+/g, '-').toLowerCase()}-ticket.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-2 rounded-md">
        <QRCodeSVG 
          id="event-qr-code"
          value={qrString} 
          size={size}
          level="M"
          includeMargin={true}
        />
      </div>
      
      {/* Hidden information for SEO and accessibility */}
      <div className="sr-only">
        <h3>Event Verification QR Code</h3>
        <p>Event: {event.name}</p>
        <p>Date: {event.date} at {event.time}</p>
        <p>Venue: {event.venue}</p>
        <p>Attendee: {user.displayName}</p>
        <p>Status: Approved</p>
      </div>
      
      <div className="flex gap-2 mt-3">
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs h-8"
          onClick={copyQRData}
        >
          <Copy className="h-3 w-3 mr-1" /> Copy
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs h-8"
          onClick={downloadQRCode}
        >
          <Download className="h-3 w-3 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
};

export default QRVerification; 