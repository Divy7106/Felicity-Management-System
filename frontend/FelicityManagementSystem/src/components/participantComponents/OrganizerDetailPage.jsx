import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrganizerDetail, toggleFollowOrganizer } from '../../services/participant'
import Button from '../Button'

function OrganizerDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [orgData, setOrgData] = useState(null)
    const [upcomingEvents, setUpcomingEvents] = useState([])
    const [pastEvents, setPastEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('upcoming')

    const baseUrl = import.meta.env.VITE_BASE_BACKEND_URL || ''

    useEffect(() => {
        fetchOrganizerDetail()
    }, [id])

    const fetchOrganizerDetail = async () => {
        try {
            setLoading(true)
            const res = await getOrganizerDetail(id)
            setOrgData(res.data.organizer)
            setUpcomingEvents(res.data.upcomingEvents || [])
            setPastEvents(res.data.pastEvents || [])
        } catch (err) {
            console.error('Failed to fetch organizer:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleFollow = async () => {
        try {
            const res = await toggleFollowOrganizer(id)
            setOrgData({ ...orgData, isFollowed: res.data.isFollowed })
        } catch (err) {
            console.error('Follow toggle failed:', err)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-white text-2xl">Loading...</p>
            </div>
        )
    }

    if (!orgData) {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-4">
                <p className="text-red-400 text-2xl">Organizer not found.</p>
                <Button variant="primary" isbaseStyles={false} className="px-6 py-2" onClick={() => navigate('/clubs-and-organizer')}>
                    Back
                </Button>
            </div>
        )
    }

    const displayEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents

    return (
        <div className="min-h-screen pb-10 px-3 sm:px-5">
            <button
                onClick={() => navigate('/clubs-and-organizer')}
                className="text-orange-400 hover:text-orange-300 mb-3 flex items-center gap-1 cursor-pointer"
            >
                ← Back to Clubs & Organizers
            </button>

            {/* Organizer Info Card */}
            <div className="bg-stone-800 rounded-xl p-5 sm:p-8 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-white text-2xl sm:text-3xl font-bold mb-2">{orgData.organizerName}</h1>
                        <span className="inline-block text-sm bg-orange-400/20 text-orange-400 px-3 py-1 rounded-full mb-4">
                            {orgData.category}
                        </span>
                        <p className="text-stone-300 text-base leading-relaxed max-w-2xl">{orgData.description}</p>
                        {orgData.contactEmail && (
                            <p className="text-stone-400 text-sm mt-4">📧 {orgData.contactEmail}</p>
                        )}
                    </div>
                    <Button
                        variant={orgData.isFollowed ? 'custom' : 'primary'}
                        isbaseStyles={false}
                        className={`px-6 py-2 text-lg ${
                            orgData.isFollowed
                                ? 'bg-stone-600 text-white rounded-md hover:bg-red-500/80 cursor-pointer'
                                : ''
                        }`}
                        onClick={handleToggleFollow}
                    >
                        {orgData.isFollowed ? 'Unfollow' : 'Follow'}
                    </Button>
                </div>
            </div>

            {/* Events Tabs */}
            <div className="flex gap-1 mb-6 bg-stone-800 rounded-lg p-1 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`px-5 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                        activeTab === 'upcoming' ? 'bg-orange-400 text-black' : 'text-stone-300 hover:text-white'
                    }`}
                >
                    Upcoming ({upcomingEvents.length})
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`px-5 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                        activeTab === 'past' ? 'bg-orange-400 text-black' : 'text-stone-300 hover:text-white'
                    }`}
                >
                    Past ({pastEvents.length})
                </button>
                <button
                    onClick={() => setActiveTab('On Going')}
                    className={`px-5 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                        activeTab === 'On Going' ? 'bg-orange-400 text-black' : 'text-stone-300 hover:text-white'
                    }`}
                >
                    Past ({pastEvents.length})
                </button>
            </div>

            {/* Events Grid */}
            {displayEvents.length === 0 ? (
                <div className="flex justify-center items-center h-48">
                    <p className="text-stone-400 text-lg">No {activeTab} events.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {displayEvents.map(event => (
                        <div
                            key={event._id}
                            onClick={() => navigate(`/event/${event._id}`)}
                            className="bg-stone-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all group"
                        >
                            <div className="relative h-40 bg-stone-700 overflow-hidden">
                                {event.coverImage ? (
                                    <img
                                        src={baseUrl + event.coverImage}
                                        alt={event.eventName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-all"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-500">No Image</div>
                                )}
                                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white ${
                                    event.eventType === 'Normal' ? 'bg-blue-500' : 'bg-purple-500'
                                }`}>
                                    {event.eventType}
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="text-white text-lg font-semibold truncate">{event.eventName}</h3>
                                <p className="text-stone-400 text-sm mt-1">
                                    {new Date(event.eventStartDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default OrganizerDetailPage
