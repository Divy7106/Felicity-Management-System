import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrgMinEvents } from '../../services/events'

function OnGoingEvents() {
    const navigate = useNavigate()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true)
                const response = await getOrgMinEvents()
                const allEvents = response.data.events || []
                // Only show ongoing events
                setEvents(allEvents.filter(e => e.status === 'onGoing'))
            } catch (err) {
                console.error('Error fetching events:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchEvents()
    }, [])

    const baseUrl = import.meta.env.VITE_BASE_BACKEND_URL || ''

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-white text-2xl">Loading events...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-10 px-3 sm:px-5">
            <h1 className="text-white text-2xl sm:text-3xl py-5 font-semibold">On Going Events</h1>

            {events.length === 0 ? (
                <div className="flex justify-center items-center h-48">
                    <p className="text-stone-400 text-lg">No ongoing events at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {events.map(event => (
                        <div
                            key={event._id}
                            onClick={() => navigate(`/ongoing-events/event/${event._id}`)}
                            className="bg-stone-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all group"
                        >
                            <div className="relative h-44 bg-stone-700 overflow-hidden">
                                {event.coverImage ? (
                                    <img
                                        src={baseUrl + event.coverImage}
                                        alt={event.eventName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-all"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-500">
                                        No Image
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-green-500">
                                    On Going
                                </div>
                                {event.eventType && (
                                    <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                                        {event.eventType}
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="text-white text-lg font-semibold truncate">
                                    {event.eventName || 'Untitled Event'}
                                </h3>
                                <p className="text-stone-400 text-sm mt-1 line-clamp-2">
                                    {event.eventDescription || 'No description.'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default OnGoingEvents
