import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  time: string;
  setTime: (time: string) => void;
  className?: string;
}

export function TimePicker({ time, setTime, className }: TimePickerProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [open, setOpen] = React.useState(false);

  // Time slots in 15-min intervals
  const timeOptions = React.useMemo(() => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        options.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return options;
  }, []);

  // Convert 24h to 12h format
  const formatDisplayTime = (time: string): string => {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Convert input to 24h format
  const parseTimeInput = (input: string): string | null => {
    // Time format patterns
    const patterns = [
      // 12-hour format with AM/PM
      /^(\d{1,2}):(\d{2})\s*(am|pm)$/i,
      /^(\d{1,2})(\d{2})\s*(am|pm)$/i,
      /^(\d{1,2})\s*(am|pm)$/i,
      
      // 24-hour format
      /^(\d{1,2}):(\d{2})$/,
      /^(\d{1,2})(\d{2})$/,
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        let hours = parseInt(match[1], 10);
        let minutes = parseInt(match[2] || '0', 10);
        
        // Adjust hours for AM/PM if present
        const isPM = match[3]?.toLowerCase() === 'pm';
        const isAM = match[3]?.toLowerCase() === 'am';
        
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        
        // Validate hours and minutes
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
    }
    
    return null;
  };

  // Handle manual input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsedTime = parseTimeInput(inputValue);
    if (parsedTime) {
      setTime(parsedTime);
      setInputValue(formatDisplayTime(parsedTime));
    } else {
      // Reset to current value if invalid
      setInputValue(time ? formatDisplayTime(time) : "");
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputBlur();
      setOpen(false);
    }
  };

  // Sync input with time prop
  React.useEffect(() => {
    setInputValue(time ? formatDisplayTime(time) : "");
  }, [time]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-background/50 border-border/50",
            !time && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {time ? formatDisplayTime(time) : <span>Select time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-3 bg-secondary border-border/30" align="start">
        <div className="space-y-3">
          <div>
            <label htmlFor="time-input" className="text-xs font-medium mb-1 block text-muted-foreground">
              Enter time
            </label>
            <Input
              id="time-input"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              placeholder="e.g. 3:30 PM"
              className="bg-background/80"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block text-muted-foreground">
              Or select a time
            </label>
            <ScrollArea className="h-[180px] border rounded-md bg-background/80">
              <div className="p-1">
                {timeOptions.map((timeOption) => (
                  <Button
                    key={timeOption}
                    variant={time === timeOption ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      time === timeOption && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      setTime(timeOption);
                      setInputValue(formatDisplayTime(timeOption));
                      setOpen(false);
                    }}
                  >
                    {formatDisplayTime(timeOption)}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 