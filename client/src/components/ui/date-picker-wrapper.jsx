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
import "../../tailwind.css"; // Import Tailwind only for this component

export function DatePickerWrapper({ 
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
    // Wrap with a div that scopes Tailwind styles
    <div className="tailwind-scope">
      <div className={`flex flex-col gap-3 ${className}`}>
        <Label htmlFor="date" className="px-1 text-sm font-medium text-gray-700">
          {label}
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date"
              className="w-full justify-between font-normal h-10 px-3 text-left"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                color: value ? '#1f2937' : '#9ca3af',
                fontSize: '14px'
              }}
            >
              {formatDate(value)}
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto overflow-hidden p-0 bg-white border border-gray-200 rounded-lg shadow-lg" 
            align="start"
          >
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
              className="rounded-md"
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <style jsx>{`
        .tailwind-scope {
          /* Scope Tailwind styles to this component only */
          --tw-ring-inset: ;
          --tw-ring-offset-width: 0px;
          --tw-ring-offset-color: #fff;
          --tw-ring-color: rgb(59 130 246 / 0.5);
          --tw-ring-offset-shadow: 0 0 #0000;
          --tw-ring-shadow: 0 0 #0000;
          --tw-shadow: 0 0 #0000;
          --tw-shadow-colored: 0 0 #0000;
          --tw-blur: ;
          --tw-brightness: ;
          --tw-contrast: ;
          --tw-grayscale: ;
          --tw-hue-rotate: ;
          --tw-invert: ;
          --tw-saturate: ;
          --tw-sepia: ;
          --tw-drop-shadow: ;
          --tw-backdrop-blur: ;
          --tw-backdrop-brightness: ;
          --tw-backdrop-contrast: ;
          --tw-backdrop-grayscale: ;
          --tw-backdrop-hue-rotate: ;
          --tw-backdrop-invert: ;
          --tw-backdrop-opacity: ;
          --tw-backdrop-saturate: ;
          --tw-backdrop-sepia: ;
        }
      `}</style>
    </div>
  );
}
