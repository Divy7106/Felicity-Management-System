import { useState, useEffect } from 'react'
import { getOrgMinEvents } from '../../services/events'
import { getOrgEventAnalytics } from '../../services/participant'
import Carousal from './Carousal'

function OrganizerDashBoard() {

    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [analytics, setAnalytics] = useState(null)

    // Fetch events on component mount
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true)
                const response = await getOrgMinEvents()
                setEvents(response.data.events || [])
                setError(null)
            } catch (err) {
                console.error('Error fetching events:', err)
                setError(err.response?.data?.msg || 'Failed to load events')
            } finally {
                setLoading(false)
            }
        }

        const fetchAnalytics = async () => {
            try {
                const res = await getOrgEventAnalytics()
                setAnalytics(res.data.analytics)
            } catch (err) {
                console.error('Error fetching analytics:', err)
            }
        }

        fetchEvents()
        fetchAnalytics()
    }, [])

    // Categorize events by status
    const draftEvents = events.filter(event => event.status === 'draft')
    const publishedEvents = events.filter(event => event.status === 'published')
    const onGoingEvents = events.filter(event => event.status === 'onGoing')
    const closedEvents = events.filter(event => event.status === 'closed')

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-white text-2xl">Loading events...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-red-500 text-2xl">{error}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-10">
            {/* Analytics Summary */}
            {analytics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-5 py-4">
                    <div className="bg-stone-800 rounded-xl p-4 sm:p-5 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-orange-400">{analytics.totalEvents}</p>
                        <p className="text-stone-400 text-xs sm:text-sm mt-1">Total Events</p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-4 sm:p-5 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-blue-400">{analytics.completedEvents}</p>
                        <p className="text-stone-400 text-xs sm:text-sm mt-1">Completed</p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-4 sm:p-5 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-green-400">{analytics.totalRegistrations}</p>
                        <p className="text-stone-400 text-xs sm:text-sm mt-1">Registrations</p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-4 sm:p-5 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-yellow-400">₹{analytics.totalRevenue}</p>
                        <p className="text-stone-400 text-xs sm:text-sm mt-1">Revenue</p>
                    </div>
                </div>
            )}

            {/* Draft Events Section - Shown First */}
            {draftEvents.length > 0 && (
                <div className="mb-8">
                    <h1 className="text-white text-2xl sm:text-3xl px-3 sm:px-5 py-4">Draft Events</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 px-3 sm:px-5">
                        {draftEvents.map((event) => (
                            <Carousal
                                key={event._id}
                                eventId={event._id}
                                eventName={event.eventName}
                                eventDescription={event.eventDescription}
                                eventType={event.eventType}
                                coverImage={event.coverImage}
                                status={event.status}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Published Events Section */}
            {publishedEvents.length > 0 && (
                <div className="mb-8">
                    <h1 className="text-white text-2xl sm:text-3xl px-3 sm:px-5 py-4">Published Events</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 px-3 sm:px-5">
                        {publishedEvents.map((event) => (
                            <Carousal
                                key={event._id}
                                eventId={event._id}
                                eventName={event.eventName}
                                eventDescription={event.eventDescription}
                                eventType={event.eventType}
                                coverImage={event.coverImage}
                                status={event.status}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* OnGoing Events Section */}
            {onGoingEvents.length > 0 && (
                <div className="mb-8">
                    <h1 className="text-white text-2xl sm:text-3xl px-3 sm:px-5 py-4">On Going Events</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 px-3 sm:px-5">
                        {onGoingEvents.map((event) => (
                            <Carousal
                                key={event._id}
                                eventId={event._id}
                                eventName={event.eventName}
                                eventDescription={event.eventDescription}
                                eventType={event.eventType}
                                coverImage={event.coverImage}
                                status={event.status}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Closed Events Section */}
            {closedEvents.length > 0 && (
                <div className="mb-8">
                    <h1 className="text-white text-2xl sm:text-3xl px-3 sm:px-5 py-4">Closed Events</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 px-3 sm:px-5">
                        {closedEvents.map((event) => (
                            <Carousal
                                key={event._id}
                                eventId={event._id}
                                eventName={event.eventName}
                                eventDescription={event.eventDescription}
                                eventType={event.eventType}
                                coverImage={event.coverImage}
                                status={event.status}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* No Events Message */}
            {events.length === 0 && (
                <div className="flex justify-center items-center h-96">
                    <p className="text-white text-2xl">No events found. Create your first event!</p>
                </div>
            )}
        </div>
    )
}

export {
    OrganizerDashBoard,
}