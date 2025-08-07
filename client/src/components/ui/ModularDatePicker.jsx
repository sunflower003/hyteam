import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import styles from './ModularDatePicker.module.css';

export function ModularDatePicker({ 
  label = "Date of birth", 
  value, 
  onChange, 
  placeholder = "Select date",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const containerRef = useRef(null);

  useEffect(() => {
    setSelectedDate(value ? new Date(value) : null);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date) => {
    if (!date) return placeholder;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    onChange(date ? date.toISOString().split('T')[0] : null);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const date = new Date(dateValue);
      handleDateSelect(date);
    }
  };

  const getMaxDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 120);
    return minDate.toISOString().split('T')[0];
  };

  return (
    <div className={`${styles.container} ${className}`} ref={containerRef}>
      <label className={styles.label}>
        {label}
      </label>
      
      <div className={styles.datePickerWrapper}>
        <button
          type="button"
          className={styles.triggerButton}
          onClick={() => setIsOpen(!isOpen)}
        >
          <CalendarIcon className={styles.calendarIcon} />
          <span className={styles.dateText}>
            {formatDate(selectedDate)}
          </span>
          <ChevronDown className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`} />
        </button>

        {isOpen && (
          <div className={styles.dropdown}>
            <div className={styles.calendarHeader}>
              <span className={styles.headerText}>Select your date of birth</span>
            </div>
            <div className={styles.calendarBody}>
              <input
                type="date"
                value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                onChange={handleInputChange}
                min={getMinDate()}
                max={getMaxDate()}
                className={styles.dateInput}
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
