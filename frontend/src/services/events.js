import api from './api'

// Unified event creation endpoint
const createEvent = (eventData) => api.post('/organizer/create-event', eventData, {
    headers: {
        'Content-Type': 'multipart/form-data'
    }
})

// DRraft creation endpoint
const createEventDraft = (eventData) => api.post('/organizer/create-event-draft', eventData, {
    headers: {
        'Content-Type': 'multipart/form-data'
    }
})

// Get minimal event details for dashboard
const getOrgMinEvents = () => api.get('/organizer/get-org-min-events')

// Get full event details by ID
const getOrgMaxEvent = (eventId) => api.get(`/organizer/get-org-max-event/${eventId}`)

// Edit event form
const editEventForm = (eventId, data) => api.put(`/organizer/edit-event-form/${eventId}`, data)

export {
    createEvent,
    getOrgMinEvents,
    getOrgMaxEvent,
    editEventForm,
    // Legacy exports for backward compatibility
    createEvent as merchandiseEventCreate,
    createEvent as normalEventCreate,
    createEventDraft,
}