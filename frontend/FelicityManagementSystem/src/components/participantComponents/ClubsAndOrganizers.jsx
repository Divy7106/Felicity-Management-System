import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllOrganizers, toggleFollowOrganizer } from '../../services/participant'
import Button from '../Button'

function ClubsAndOrganizers() {
    const navigate = useNavigate()
    const [organizers, setOrganizers] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterCategory, setFilterCategory] = useState('All')

    useEffect(() => {
        fetchOrganizers()
    }, [])

    const fetchOrganizers = async () => {
        try {
            setLoading(true)
            const res = await getAllOrganizers()
            setOrganizers(res.data.organizers || [])
        } catch (err) {
            console.error('Failed to fetch organizers:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleFollow = async (orgId) => {
        try {
            const res = await toggleFollowOrganizer(orgId)
            setOrganizers(organizers.map(org =>
                org._id === orgId ? { ...org, isFollowed: res.data.isFollowed } : org
            ))
        } catch (err) {
            console.error('Follow toggle failed:', err)
        }
    }

    const handleOrganizerDetailsPage = async (e, orgId) => {
        navigate(`organizer/${orgId}`)
    }

    const categories = ['All', ...new Set(organizers.map(o => o.category).filter(Boolean))]
    const filtered = filterCategory === 'All'
        ? organizers
        : organizers.filter(o => o.category === filterCategory)

    const categoryColors = {
        Technical: 'bg-blue-500/20 text-blue-400',
        Cultural: 'bg-purple-500/20 text-purple-400',
        Sports: 'bg-green-500/20 text-green-400',
        Literary: 'bg-yellow-500/20 text-yellow-400',
        Design: 'bg-pink-500/20 text-pink-400',
        Management: 'bg-cyan-500/20 text-cyan-400',
        'Social/Community': 'bg-rose-500/20 text-rose-400',
        Gaming: 'bg-indigo-500/20 text-indigo-400',
        'Fest Team': 'bg-orange-500/20 text-orange-400',
        Other: 'bg-stone-500/20 text-stone-400',
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <p className="text-white text-2xl">Loading clubs & organizers...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-10 px-3 sm:px-5">
            <h1 className="text-white text-2xl sm:text-3xl py-5 font-semibold">Clubs & Organizers</h1>

            {/* Category Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                            filterCategory === cat
                                ? 'bg-orange-400 text-black'
                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Organizers Grid */}
            {filtered.length === 0 ? (
                <div className="flex justify-center items-center h-48">
                    <p className="text-stone-400 text-lg">No organizers found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filtered.map(org => (
                        <div key={org._id} className="bg-stone-800 rounded-xl p-6 hover:ring-2 hover:ring-orange-400 transition-all" onClick={(e) => handleOrganizerDetailsPage(e, org._id)}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3
                                        className="text-white text-xl font-semibold cursor-pointer hover:text-orange-400 transition-colors"
                                        onClick={() => navigate(`/organizer/${org._id}`)}
                                    >
                                        {org.organizerName}
                                    </h3>
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                                        categoryColors[org.category] || 'bg-stone-500/20 text-stone-400'
                                    }`}>
                                        {org.category}
                                    </span>
                                </div>
                                <Button
                                    variant={org.isFollowed ? 'custom' : 'primary'}
                                    isbaseStyles={false}
                                    className={`px-4 py-1.5 text-sm ${
                                        org.isFollowed
                                            ? 'bg-stone-600 text-white rounded-md hover:bg-red-500/80 cursor-pointer'
                                            : ''
                                    }`}
                                    onClick={() => handleToggleFollow(org._id)}
                                >
                                    {org.isFollowed ? 'Unfollow' : 'Follow'}
                                </Button>
                            </div>
                            <p className="text-stone-400 text-sm line-clamp-3">{org.description || 'No description available.'}</p>
                            {org.contactEmail && (
                                <p className="text-stone-500 text-xs mt-3">📧 {org.contactEmail}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ClubsAndOrganizers
