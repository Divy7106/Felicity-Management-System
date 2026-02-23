import { useState, useEffect } from "react"
import { Button } from "../../components"
import { Link } from "react-router-dom"
import { getAdminOrganizers, deleteOrganizer } from "../../services/org"

function ManageClubsAndOrganizerPage() {
    const [organizers, setOrganizers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [message, setMessage] = useState({ text: '', type: '' })
    const [deletingId, setDeletingId] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)

    useEffect(() => {
        fetchOrganizers()
    }, [])

    const fetchOrganizers = async (searchTerm = '') => {
        try {
            setLoading(true)
            const res = await getAdminOrganizers(searchTerm)
            setOrganizers(res.data.organizers || [])
        } catch (err) {
            console.error('Failed to fetch organizers:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e) => {
        e.preventDefault()
        fetchOrganizers(search)
    }

    const handleDelete = async (orgId, orgName) => {
        try {
            setDeletingId(orgId)
            setMessage({ text: '', type: '' })
            await deleteOrganizer(orgId)
            setMessage({ text: `"${orgName}" and all associated data deleted successfully.`, type: 'success' })
            setConfirmDelete(null)
            fetchOrganizers(search)
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Delete failed.', type: 'error' })
        } finally {
            setDeletingId(null)
        }
    }

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

    return (
        <div className="min-h-screen pb-10 px-3 sm:px-5 bg-stone-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-5 gap-3">
                <h1 className="text-white text-2xl sm:text-3xl font-semibold">Manage Clubs & Organizers</h1>
                <Link
                    to="/manage-clubs-and-organizer/organizer-creation"
                    className="bg-stone-800 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-stone-700 transition-all duration-150 active:bg-orange-500"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                    </svg>
                    Organizer
                </Link>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, or category..."
                        className="flex-1 px-4 py-2.5 bg-stone-800 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:ring-2 focus:ring-orange-400 outline-none"
                    />
                    <Button variant="primary" isbaseStyles={false} className="px-6 py-2" type="submit">
                        Search
                    </Button>
                    {search && (
                        <Button
                            variant="custom"
                            isbaseStyles={false}
                            className="px-4 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-500 cursor-pointer"
                            onClick={() => { setSearch(''); fetchOrganizers('') }}
                        >
                            Clear
                        </Button>
                    )}
                </div>
            </form>

            {/* Message */}
            {message.text && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                    message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <p className="text-white text-xl">Loading organizers...</p>
                </div>
            ) : organizers.length === 0 ? (
                <div className="flex justify-center items-center h-48">
                    <p className="text-stone-400 text-lg">No organizers found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {organizers.map(org => (
                        <div key={org._id} className="bg-stone-800 rounded-xl p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-white text-lg font-semibold">{org.organizerName}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            categoryColors[org.category] || 'bg-stone-500/20 text-stone-400'
                                        }`}>
                                            {org.category}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-stone-400">Login Email: </span>
                                            <span className="text-white font-mono">{org.email}</span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400">Contact Email: </span>
                                            <span className="text-white">{org.contactEmail}</span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400">Created: </span>
                                            <span className="text-white">{new Date(org.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="sm:ml-4 w-full sm:w-auto">
                                    {confirmDelete === org._id ? (
                                        <div className="flex flex-col gap-2 items-end">
                                            <p className="text-red-400 text-xs">Delete organizer & all data?</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="danger"
                                                    isbaseStyles={false}
                                                    className="px-3 py-1.5 text-sm rounded-lg"
                                                    onClick={() => handleDelete(org._id, org.organizerName)}
                                                    disabled={deletingId === org._id}
                                                >
                                                    {deletingId === org._id ? 'Deleting...' : 'Confirm'}
                                                </Button>
                                                <Button
                                                    variant="custom"
                                                    isbaseStyles={false}
                                                    className="px-3 py-1.5 text-sm bg-stone-600 text-white rounded-md hover:bg-stone-500 cursor-pointer"
                                                    onClick={() => setConfirmDelete(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="danger"
                                            isbaseStyles={false}
                                            className="px-4 py-1.5 text-sm rounded-lg"
                                            onClick={() => setConfirmDelete(org._id)}
                                        >
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
        </div>
    )
}

export default ManageClubsAndOrganizerPage