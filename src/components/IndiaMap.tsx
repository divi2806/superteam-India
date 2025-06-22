import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EventModal } from './EventModal';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  id: string;
  name: string;
  venue: string;
  mode: 'online' | 'offline';
  description: string;
  date: string;
  time: string;
  createdBy: string;
  createdByName: string;
  coordinates: [number, number];
  registrations: any[];
  communityId?: string;
  communityName?: string;
  communityImageURL?: string;
  imageURL?: string;
  isFull?: boolean;
  isRecurring?: boolean;
  isRecurringChild?: boolean;
  recurringOptions?: {
    parentEventId?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    dates?: string[];
    occurrenceNumber?: number;
  };
  pendingApproval?: boolean;
}

const IndiaMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [78.9629, 20.5937], // Center of India
      zoom: 4.5,
      minZoom: 3.5,
      maxZoom: 14
    });

    // Set strict bounds to restrict view to India
    const bounds = new mapboxgl.LngLatBounds(
      [68.0, 6.0], // Southwest coordinates - Arabian Sea
      [97.5, 37.0] // Northeast coordinates - Himalayan region
    );
    
    map.current.setMaxBounds(bounds);

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl({
      showCompass: false
    }), 'top-right');

    // Create a query for all events
    const eventsQuery = query(collection(db, 'events'));

    // Listen for events from Firestore
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        const eventData = { id: doc.id, ...doc.data() } as Event;
        
        // Only add offline events with coordinates that are not pending approval
        if (
          eventData.coordinates && 
          eventData.coordinates.length === 2 && 
          eventData.mode === 'offline' && 
          !eventData.pendingApproval
        ) {
          // For recurring events, only show parent events on the map
          if (!eventData.isRecurringChild) {
            eventsData.push(eventData);
          }
        }
      });
      
      console.log(`Loaded ${eventsData.length} approved offline events for the map`);
      setEvents(eventsData);
    });

    return () => {
      unsubscribe();
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Group events by coordinates
    const eventsByLocation: { [key: string]: Event[] } = {};
    
    events.forEach(event => {
      if (!event.coordinates) return;
      
      const locationKey = `${event.coordinates[0]},${event.coordinates[1]}`;
      
      if (!eventsByLocation[locationKey]) {
        eventsByLocation[locationKey] = [];
      }
      
      eventsByLocation[locationKey].push(event);
    });

    // Create markers for each location
    Object.entries(eventsByLocation).forEach(([locationKey, locationEvents]) => {
      const [lng, lat] = locationKey.split(',').map(Number);
      const coordinates: [number, number] = [lng, lat];
      
      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-event-marker';
      
      // If there's only one event at this location, create a normal marker
      if (locationEvents.length === 1) {
        const event = locationEvents[0];
        
        // Use different marker styles based on event type
        const isOnline = event.mode === 'online';
        const isCommunityEvent = !!event.communityId;
        const isRecurring = event.isRecurring;
        const isCreatedByUser = event.createdBy === user?.uid;
        
        // Determine marker class based on event type
        let markerClass = isOnline ? 'online' : 'offline';
        if (isCommunityEvent) {
          markerClass = 'community';
        }
        
        if (isCommunityEvent) {
          markerEl.innerHTML = `
            <div class="marker-container">
              <div class="event-marker community ${isRecurring ? 'recurring' : ''}">
                <img src="${event.communityImageURL}" alt="${event.communityName}" class="community-icon" />
                ${isRecurring ? '<div class="recurring-badge"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/></svg></div>' : ''}
              </div>
              <div class="marker-shadow"></div>
            </div>
          `;
        } else {
          markerEl.innerHTML = `
            <div class="marker-container">
              <div class="event-marker ${markerClass} ${isRecurring ? 'recurring' : ''}">
                <div class="marker-icon">
                  ${isOnline ? 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>' : 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>'
                  }
                  ${isRecurring ? '<div class="recurring-badge"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/></svg></div>' : ''}
                </div>
              </div>
              <div class="marker-shadow"></div>
            </div>
          `;
        }

        // Get recurring info text if applicable
        const recurringInfoText = event.isRecurring && event.recurringOptions?.dates?.length 
          ? `<p class="popup-recurring">Recurring event (${event.recurringOptions.dates.length} occurrences)</p>` 
          : '';
          
        // Determine badge for user's created events
        const createdByUserBadge = isCreatedByUser 
          ? `<span class="popup-badge creator">Created by You</span>` 
          : '';
          
        // Determine badge for event type
        const eventTypeBadge = isCommunityEvent 
          ? `<span class="popup-badge community">Community</span>` 
          : isOnline 
            ? `<span class="popup-badge online">Online</span>` 
            : `<span class="popup-badge offline">In-Person</span>`;

        // Create popup with event info
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
          className: 'event-popup'
        }).setHTML(`
          <div class="popup-content">
            ${event.imageURL ? 
              `<div class="popup-image-container">
                <img src="${event.imageURL}" alt="${event.name}" class="popup-image" />
              </div>` : ''
            }
            <div class="popup-header">
              <h3>${event.name}</h3>
              <div class="popup-badges">
                ${createdByUserBadge}
                ${eventTypeBadge}
                ${event.isRecurring ? '<span class="popup-badge recurring">Recurring</span>' : ''}
              </div>
            </div>
            ${event.communityName ? `<p class="popup-community">By ${event.communityName}</p>` : ''}
            ${recurringInfoText}
            <div class="popup-details">
              <p class="popup-date"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${event.date} at ${event.time}</p>
              <p class="popup-venue"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${event.venue}</p>
            </div>
            <button class="popup-button">View Details</button>
          </div>
        `);

        // Add hover effects
        markerEl.addEventListener('mouseenter', () => {
          markerEl.classList.add('hover');
          popup.addTo(map.current!);
        });

        markerEl.addEventListener('mouseleave', () => {
          markerEl.classList.remove('hover');
          popup.remove();
        });

        // Open event modal on click
        markerEl.addEventListener('click', () => {
          setSelectedEvent(event);
          setIsModalOpen(true);
        });

        // Add popup click handler
        popup.on('open', () => {
          const button = document.querySelector('.popup-button');
          if (button) {
            button.addEventListener('click', () => {
              setSelectedEvent(event);
              setIsModalOpen(true);
            });
          }
        });

        // Add marker to map
        new mapboxgl.Marker(markerEl)
          .setLngLat(coordinates)
          .setPopup(popup)
          .addTo(map.current!);
      } else {
        // Create a cluster marker for multiple events
        markerEl.innerHTML = `
          <div class="marker-container">
            <div class="event-marker cluster">
              <span class="cluster-count">${locationEvents.length}</span>
            </div>
            <div class="marker-shadow"></div>
          </div>
        `;

        // Create popup with list of events
        const popupContent = `
          <div class="popup-content cluster-popup">
            <div class="popup-header">
              <h3>${locationEvents.length} Events at this location</h3>
            </div>
            <div class="cluster-events-list">
              ${locationEvents.map(event => {
                const isOnline = event.mode === 'online';
                const isCommunityEvent = !!event.communityId;
                
                // Determine badge for event type
                const eventTypeBadge = isCommunityEvent 
                  ? `<span class="popup-badge community">Community</span>` 
                  : isOnline 
                    ? `<span class="popup-badge online">Online</span>` 
                    : `<span class="popup-badge offline">In-Person</span>`;
                
                return `
                  <div class="cluster-event-item" data-event-id="${event.id}">
                    <div class="cluster-event-header">
                      <h4>${event.name}</h4>
                      <div class="popup-badges">
                        ${eventTypeBadge}
                        ${event.isRecurring ? '<span class="popup-badge recurring">Recurring</span>' : ''}
                      </div>
                    </div>
                    ${event.communityName ? `<p class="popup-community">By ${event.communityName}</p>` : ''}
                    <div class="popup-details">
                      <p class="popup-date"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${event.date}</p>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          className: 'event-popup cluster-popup'
        }).setHTML(popupContent);

        // Add hover and click effects
        markerEl.addEventListener('mouseenter', () => {
          markerEl.classList.add('hover');
        });

        markerEl.addEventListener('mouseleave', () => {
          markerEl.classList.remove('hover');
        });

        // Show popup on click
        markerEl.addEventListener('click', () => {
          popup.addTo(map.current!);
        });

        // Add event listeners to cluster event items
        popup.on('open', () => {
          const eventItems = document.querySelectorAll('.cluster-event-item');
          eventItems.forEach(item => {
            item.addEventListener('click', () => {
              const eventId = item.getAttribute('data-event-id');
              const selectedEvent = locationEvents.find(e => e.id === eventId);
              if (selectedEvent) {
                setSelectedEvent(selectedEvent);
                setIsModalOpen(true);
                popup.remove();
              }
            });
          });
        });

        // Add marker to map
        new mapboxgl.Marker(markerEl)
          .setLngLat(coordinates)
          .addTo(map.current!);
      }
    });

    // Add custom CSS for markers
    const style = document.createElement('style');
    style.textContent = `
      .custom-event-marker {
        cursor: pointer;
      }
      
      .marker-container {
        position: relative;
        width: 36px;
        height: 36px;
        transition: all 0.3s ease;
      }
      
      .event-marker {
        position: absolute;
        top: 0;
        left: 0;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #8257ff;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        transform-origin: center bottom;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        z-index: 2;
      }
      
      .event-marker.online {
        background: #3b82f6;
      }
      
      .event-marker.offline {
        background: #10b981;
      }
      
      .event-marker.community {
        background: transparent;
        border: none;
        box-shadow: none;
      }
      
      .event-marker.cluster {
        background: #f97316;
        border: 2px solid rgba(255, 255, 255, 0.5);
        font-weight: bold;
        font-size: 14px;
      }
      
      .cluster-count {
        font-weight: bold;
      }
      
      .community-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
      }
      
      .event-marker.recurring::after {
        content: '';
        position: absolute;
        top: -2px;
        right: -2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #f59e0b;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .marker-shadow {
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 24px;
        height: 4px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.3);
        filter: blur(2px);
        z-index: 1;
        transition: all 0.3s ease;
      }
      
      .custom-event-marker.hover .event-marker {
        transform: translateY(-4px) scale(1.05);
      }
      
      .custom-event-marker.hover .community-icon {
        transform: scale(1.05);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }
      
      .custom-event-marker.hover .marker-shadow {
        width: 28px;
        opacity: 0.2;
      }
      
      .cluster-events-list {
        max-height: 300px;
        overflow-y: auto;
        margin-top: 10px;
      }
      
      .cluster-event-item {
        padding: 10px;
        border-radius: 8px;
        margin-bottom: 8px;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .cluster-event-item:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }
      
      .cluster-event-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 4px;
      }
      
      .cluster-event-item h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }
      
      .cluster-popup .mapboxgl-popup-content {
        width: 280px;
      }
      
      .event-popup {
        z-index: 10;
      }
      
      .event-popup {
        max-width: 280px !important;
      }
      
      .mapboxgl-popup-content {
        padding: 0 !important;
        border-radius: 12px !important;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3) !important;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: #1a1b26 !important;
      }
      
      .mapboxgl-popup-tip {
        border-top-color: #1a1b26 !important;
        border-bottom-color: #1a1b26 !important;
      }
      
      .popup-content {
        padding: 0;
      }
      
      .popup-image-container {
        width: 100%;
        height: 120px;
        overflow: hidden;
        position: relative;
      }
      
      .popup-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .popup-header {
        padding: 12px 16px 8px;
      }
      
      .popup-header h3 {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: white;
      }
      
      .popup-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
      }
      
      .popup-badge {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
      }
      
      .popup-badge.creator {
        background-color: rgba(130, 87, 255, 0.15);
        color: #8257ff;
        border: 1px solid rgba(130, 87, 255, 0.3);
      }
      
      .popup-badge.community {
        background: rgba(236, 72, 153, 0.15);
        color: #f472b6;
      }
      
      .popup-badge.online {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
      }
      
      .popup-badge.offline {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }
      
      .popup-badge.recurring {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }
      
      .popup-community {
        padding: 0 16px;
        margin: 0 0 8px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .popup-recurring {
        padding: 0 16px;
        margin: 0 0 8px;
        font-size: 12px;
        color: #fbbf24;
        display: flex;
        align-items: center;
      }
      
      .popup-details {
        padding: 0 16px 12px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .popup-date, .popup-venue {
        margin: 0 0 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .popup-button {
        width: 100%;
        padding: 10px;
        background: #8257ff;
        color: white;
        border: none;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .popup-button:hover {
        background: #9373ff;
      }
      
      .recurring-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #f59e0b;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 8px;
        border: 2px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [events, user?.uid]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div ref={mapContainer} className="w-full h-full">
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default IndiaMap;
