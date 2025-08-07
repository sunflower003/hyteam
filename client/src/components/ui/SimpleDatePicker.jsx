"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import styles from './DatePicker.module.css'

export function SimpleDatePicker({ label = "Date of birth", value, onChange, placeholder = "Select date" }) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState(value ? new Date(value) : undefined)
  const containerRef = React.useRef(null)

  // Update date when value prop changes
  React.useEffect(() => {
    setDate(value ? new Date(value) : undefined)
  }, [value])

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate)
    setOpen(false)
    // Convert to ISO string for backend compatibility
    onChange(selectedDate ? selectedDate.toISOString().split('T')[0] : null)
  }

  const handleDateInputChange = (e) => {
    const dateValue = e.target.value
    if (dateValue) {
      const selectedDate = new Date(dateValue)
      handleDateSelect(selectedDate)
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <label htmlFor="date" className={styles.label}>
        {label}
      </label>
      <div className={styles.popoverContainer}>
        <button
          type="button"
          className={styles.triggerButton}
          id="date"
          onClick={() => setOpen(!open)}
        >
          <span className={styles.buttonText}>
            {date ? date.toLocaleDateString() : placeholder}
          </span>
          <ChevronDown className={styles.chevronIcon} />
        </button>
        
        {open && (
          <div className={styles.popoverContent}>
            <div className={styles.calendarContainer}>
              <input
                type="date"
                value={date ? date.toISOString().split('T')[0] : ''}
                onChange={handleDateInputChange}
                className={styles.dateInput}
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
