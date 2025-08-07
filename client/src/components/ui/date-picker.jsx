import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({ 
  label = "Date of birth", 
  value, 
  onChange, 
  placeholder = "Select date",
  className = ""
}) {
  const [open, setOpen] = useState(false);

  const handleDateSelect = (selectedDate) => {
    onChange(selectedDate);
    setOpen(false);
  };

  const formatDate = (date) => {
    if (!date) return placeholder;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <Label htmlFor="date" className="px-1">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-full justify-between font-normal"
          >
            {formatDate(value)}
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            captionLayout="dropdown"
            onSelect={handleDateSelect}
            disabled={(date) => 
              date > new Date() || // Disable future dates
              date < new Date("1900-01-01") // Disable very old dates
            }
            fromYear={1930}
            toYear={new Date().getFullYear()}
            defaultMonth={value ? new Date(value) : new Date(2000, 0)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
