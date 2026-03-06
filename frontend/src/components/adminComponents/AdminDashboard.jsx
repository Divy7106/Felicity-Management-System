import { useState, useEffect } from 'react'
import { getDashboardStats } from '../../services/org'

function AdminDashboard() {
    const [stats, setStats] = useState(null)
    const [recentOrganizers, setRecentOrganizers] = useState([])
    const [recentEvents, setRecentEvents] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            setLoading(true)
            const res = await getDashboardStats()
            setStats(res.data.stats)
            setRecentOrganizers(res.data.recentOrganizers || [])
            setRecentEvents(res.data.recentEvents || [])
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <p className="text-white text-2xl">Loading dashboard...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-10 px-3 sm:px-5">
            <h1 className="text-white text-2xl sm:text-3xl py-5 font-semibold">Admin Dashboard</h1>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
                    <div className="bg-stone-800 rounded-xl p-4 sm:p-5 text-center">
                        <p className="text-2xl sm:text-3xl font-bold text-orange-400">{stats.totalParticipants}</p>
                        <p className="text-stone-400 text-xs sm:text-sm mt-1">Total Participants</p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-4 sm:p-5 text-center">
                        <p className="text-2xl sm:text-3xl font-bold text-blue-400">{stats.totalOrganizers}</p>
                        <p className="text-stone-400 text-xs sm:text-sm mt-1">Total Organizers</p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-4 sm:p-5 text-center">
                        <p className="text-2xl sm:text-3xl font-bold text-green-400">{stats.totalActiveEvents}</p>
                        <p className="text-stone-400 text-xs sm:text-sm mt-1">Active Events</p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-4 sm:p-5 text-center">
                        <p className="text-2xl sm:text-3xl font-bold text-yellow-400">₹{stats.totalRevenue}</p>
                        <p className="text-stone-400 text-xs sm:text-sm mt-1">Merchandise Revenue</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Organizers */}
                <div className="bg-stone-800 rounded-xl p-6">
                    <h2 className="text-white text-xl font-semibold mb-4">Recent Organizers</h2>
                    {recentOrganizers.length === 0 ? (
                        <p className="text-stone-400 text-sm">No organizers registered yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentOrganizers.map(org => (
                                <div key={org._id} className="bg-stone-700 rounded-lg p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-white font-semibold">{org.organizerName}</p>
                                        <p className="text-stone-400 text-xs">{org.contactEmail}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                                            {org.category}
                                        </span>
                                        <p className="text-stone-500 text-xs mt-1">
                                            {new Date(org.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Events */}
                <div className="bg-stone-800 rounded-xl p-6">
                    <h2 className="text-white text-xl font-semibold mb-4">Recent Events</h2>
                    {recentEvents.length === 0 ? (
                        <p className="text-stone-400 text-sm">No events created yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentEvents.map(event => (
                                <div key={event._id} className="bg-stone-700 rounded-lg p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-white font-semibold">{event.eventName}</p>
                                        <p className="text-stone-400 text-xs">by {event.organizerName}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            event.eventType === 'Normal'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-purple-500/20 text-purple-400'
                                        }`}>
                                            {event.eventType}
                                        </span>
                                        <p className="text-stone-500 text-xs mt-1">
                                            {new Date(event.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export { AdminDashboard }
