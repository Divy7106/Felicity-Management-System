import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { browseEvents, getTrendingEvents } from '../../services/participant'
import Button from '../Button'

function BrowseEvents() {
    const navigate = useNavigate()
    const [events, setEvents] = useState([])
    const [trending, setTrending] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filters, setFilters] = useState({
        eventType: 'All',
        eligibility: 'All',
        dateFrom: '',
        dateTo: '',
        followedOnly: false,
    })

    useEffect(() => {
        fetchEvents()
        fetchTrending()
    }, [])

    // Auto-search when search term or filters change (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch()
        }, 400)
        return () => clearTimeout(timer)
    }, [search, filters])

    const fetchEvents = async (params = {}) => {
        try {
            setLoading(true)
            const res = await browseEvents(params)
            setEvents(res.data.events || [])
        } catch (err) {
            console.error('Failed to browse events:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchTrending = async () => {
        try {
            const res = await getTrendingEvents()
            setTrending(res.data.events || [])
        } catch (err) {
            console.error('Failed to get trending:', err)
        }
    }

    const handleSearch = () => {
        const params = { search }
        if (filters.eventType !== 'All') params.eventType = filters.eventType
        if (filters.eligibility !== 'All') params.eligibility = filters.eligibility
        if (filters.dateFrom) params.dateFrom = filters.dateFrom
        if (filters.dateTo) params.dateTo = filters.dateTo
        if (filters.followedOnly) params.followedOnly = 'true'
        fetchEvents(params)
    }

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)

        const params = { search }
        if (newFilters.eventType !== 'All') params.eventType = newFilters.eventType
        if (newFilters.eligibility !== 'All') params.eligibility = newFilters.eligibility
        if (newFilters.dateFrom) params.dateFrom = newFilters.dateFrom
        if (newFilters.dateTo) params.dateTo = newFilters.dateTo
        if (newFilters.followedOnly) params.followedOnly = 'true'
        fetchEvents(params)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch()
    }

    const baseUrl = import.meta.env.VITE_BASE_BACKEND_URL || ''

    return (
        <div className="min-h-screen pb-10 px-3 sm:px-5">
            <h1 className="text-white text-2xl sm:text-3xl py-5 font-semibold">Browse Events</h1>

            {/* Search & Filters */}
            <div className="bg-stone-800 rounded-xl p-4 sm:p-5 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search events or organizers..."
                        className="flex-1 px-4 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                    />
                    <Button variant="primary" isbaseStyles={false} className="px-6 py-2" onClick={handleSearch}>
                        Search
                    </Button>
                </div>

                <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-stone-400 text-sm">Type:</label>
                        <select
                            value={filters.eventType}
                            onChange={(e) => handleFilterChange('eventType', e.target.value)}
                            className="bg-stone-700 text-white px-3 py-1.5 rounded-lg border border-stone-600 text-sm cursor-pointer"
                        >
                            <option value="All">All</option>
                            <option value="Normal">Normal</option>
                            <option value="Merchandise">Merchandise</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-stone-400 text-sm">Eligibility:</label>
                        <select
                            value={filters.eligibility}
                            onChange={(e) => handleFilterChange('eligibility', e.target.value)}
                            className="bg-stone-700 text-white px-3 py-1.5 rounded-lg border border-stone-600 text-sm cursor-pointer"
                        >
                            <option value="All">All</option>
                            <option value="IIITH">IIITH Only</option>
                            <option value="Non-IIITH">Non-IIITH Only</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-stone-400 text-sm">From:</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                            className="bg-stone-700 text-white px-3 py-1.5 rounded-lg border border-stone-600 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-stone-400 text-sm">To:</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                            className="bg-stone-700 text-white px-3 py-1.5 rounded-lg border border-stone-600 text-sm"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-stone-400 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.followedOnly}
                            onChange={(e) => handleFilterChange('followedOnly', e.target.checked)}
                            className="rounded accent-orange-400"
                        />
                        Followed Clubs Only
                    </label>
                </div>
            </div>

            {/* Trending Section */}
            {trending.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-white text-xl sm:text-2xl mb-4 flex items-center gap-2">
                        <span className="text-orange-400">🔥</span> Trending Now
                    </h2>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {trending.map(event => (
                            <div
                                key={event._id}
                                onClick={() => navigate(`/event/${event._id}`)}
                                className="min-w-64 bg-stone-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all m-2"
                            >
                                <div className="h-32 bg-stone-700 overflow-hidden">
                                    {event.coverImage ? (
                                        <img src={baseUrl + event.coverImage} alt={event.eventName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-500">No Image</div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <h3 className="text-white font-semibold truncate">{event.eventName}</h3>
                                    <p className="text-stone-400 text-sm">{event.organizerName}</p>
                                    <p className="text-orange-400 text-xs mt-1">{event.registrationCount} registrations today</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Events Grid */}
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <p className="text-white text-xl">Loading events...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="flex justify-center items-center h-48">
                    <p className="text-stone-400 text-lg">No events found. Try adjusting your filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {events.map(event => (
                        <div
                            key={event._id}
                            onClick={() => navigate(`/event/${event._id}`)}
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
                                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white ${
                                    event.eventType === 'Normal' ? 'bg-blue-500' : 'bg-purple-500'
                                }`}>
                                    {event.eventType}
                                </div>
                                {event.registrationCount >= event.registrationLimit && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                                        Full
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="text-white text-lg font-semibold truncate">{event.eventName}</h3>
                                <p className="text-stone-400 text-sm mt-1">{event.organizerName}</p>
                                <p className="text-stone-500 text-xs mt-2 line-clamp-2">
                                    {event.eventDescription || 'No description.'}
                                </p>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-stone-400 text-xs">
                                        {new Date(event.eventStartDate).toLocaleDateString()}
                                    </span>
                                    <span className="text-orange-400 text-sm font-semibold">
                                        {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                                    </span>
                                </div>
                                {event.preferenceScore > 0 && (
                                    <div className="mt-2 text-xs text-green-400 font-medium">
                                        ⭐ {event.preferenceScore} interest{event.preferenceScore > 1 ? 's' : ''} matched
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {(event.eventTags || []).slice(0, 3).map((tag, i) => (
                                        <span key={i} className="text-xs bg-stone-700 text-stone-300 px-2 py-0.5 rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default BrowseEvents
