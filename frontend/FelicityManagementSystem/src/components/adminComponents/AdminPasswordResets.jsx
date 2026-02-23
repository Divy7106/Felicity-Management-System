import { useState, useEffect } from 'react'
import { getPasswordResetRequests, changeOrganizerPassword, rejectPasswordReset } from '../../services/org'
import Button from '../Button'
import Input from '../Input'

function AdminPasswordResets() {
    const [activeRequests, setActiveRequests] = useState([])
    const [completedRequests, setCompletedRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState({ text: '', type: '' })
    const [changingId, setChangingId] = useState(null)
    const [newPasswords, setNewPasswords] = useState({})
    const [showNewPassword, setShowNewPassword] = useState({})
    const [processingId, setProcessingId] = useState(null)

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            const res = await getPasswordResetRequests()
            setActiveRequests(res.data.activeRequests || [])
            setCompletedRequests(res.data.completedRequests || [])
        } catch (err) {
            console.error('Failed to fetch reset requests:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleChangePassword = async (requestId) => {
        const newPwd = newPasswords[requestId]
        if (!newPwd || newPwd.length < 8) {
            setMessage({ text: 'Password must be at least 8 characters.', type: 'error' })
            return
        }
        try {
            setProcessingId(requestId)
            setMessage({ text: '', type: '' })
            await changeOrganizerPassword(requestId, newPwd)
            setMessage({ text: 'Password changed successfully. Organizer notified via email.', type: 'success' })
            setChangingId(null)
            setNewPasswords(prev => ({ ...prev, [requestId]: '' }))
            fetchRequests()
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Failed to change password.', type: 'error' })
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async (requestId) => {
        try {
            setProcessingId(requestId)
            setMessage({ text: '', type: '' })
            await rejectPasswordReset(requestId)
            setMessage({ text: 'Request rejected. Organizer notified via email.', type: 'success' })
            fetchRequests()
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Failed to reject request.', type: 'error' })
        } finally {
            setProcessingId(null)
        }
    }

    const generateSecurePassword = (requestId) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()"
        let password = ""
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setNewPasswords(prev => ({ ...prev, [requestId]: password }))
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <p className="text-white text-2xl">Loading requests...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-10 px-5">
            <h1 className="text-white text-3xl py-5 font-semibold">Password Reset Requests</h1>

            {/* Message */}
            {message.text && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                    message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Active Requests */}
            <div className="mb-8">
                <h2 className="text-white text-xl font-semibold mb-4">
                    Active Requests
                    <span className="text-stone-400 text-sm font-normal ml-2">({activeRequests.length})</span>
                </h2>

                {activeRequests.length === 0 ? (
                    <div className="bg-stone-800 rounded-xl p-6 text-center">
                        <p className="text-stone-400">No pending password reset requests.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeRequests.map(req => (
                            <div key={req._id} className="bg-stone-800 rounded-xl p-5">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-white text-lg font-semibold">{req.organizerName}</h3>
                                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                                                Pending
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-stone-400">Login Email: </span>
                                                <span className="text-white font-mono">{req.organizerEmail}</span>
                                            </div>
                                            <div>
                                                <span className="text-stone-400">Contact Email: </span>
                                                <span className="text-white">{req.contactEmail}</span>
                                            </div>
                                            <div>
                                                <span className="text-stone-400">Requested: </span>
                                                <span className="text-white">{new Date(req.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {changingId === req._id ? (
                                    <div className="mt-4 bg-stone-900 rounded-lg p-4">
                                        <div className="flex items-center gap-3 justify-center">
                                            <div className="flex-1">
                                                <Input
                                                    label="New Password"
                                                    name={`newPassword-${req._id}`}
                                                    type={showNewPassword[req._id] ? 'text' : 'password'}
                                                    value={newPasswords[req._id] || ''}
                                                    placeholder={"Enter or generate new password."}
                                                    onChange={(e) => setNewPasswords(prev => ({ ...prev, [req._id]: e.target.value }))}
                                                    className="text-white"
                                                />
                                            </div>
                                            <Button
                                                variant="custom"
                                                isbaseStyles={false}
                                                className="px-3 text-lg py-2.5 mt-4 bg-stone-600 text-white rounded-md hover:bg-stone-500 cursor-pointer"
                                                onClick={() => setShowNewPassword(prev => ({ ...prev, [req._id]: !prev[req._id] }))}
                                            >
                                                {showNewPassword[req._id] ? 'Hide' : 'Show'}
                                            </Button>
                                            <Button
                                                variant="primary"
                                                isbaseStyles={false}
                                                className="px-3 py-2.5 mt-4"
                                                onClick={() => generateSecurePassword(req._id)}
                                            >
                                                Generate
                                            </Button>
                                        </div>
                                        <div className="flex gap-3 mt-3">
                                            <Button
                                                variant="success"
                                                isbaseStyles={false}
                                                className="px-4 py-1.5 text-lg rounded-lg"
                                                onClick={() => handleChangePassword(req._id)}
                                                disabled={processingId === req._id}
                                            >
                                                {processingId === req._id ? 'Changing...' : 'Confirm Change'}
                                            </Button>
                                            <Button
                                                variant="custom"
                                                isbaseStyles={false}
                                                className="px-4 py-1.5 text-lg bg-stone-600 text-white rounded-md hover:bg-stone-500 cursor-pointer"
                                                onClick={() => setChangingId(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 mt-4">
                                        <Button
                                            variant="primary"
                                            isbaseStyles={false}
                                            className="px-4 py-1.5 text-sm"
                                            onClick={() => setChangingId(req._id)}
                                        >
                                            Change Password
                                        </Button>
                                        <Button
                                            variant="danger"
                                            isbaseStyles={false}
                                            className="px-4 py-1.5 text-sm rounded-lg"
                                            onClick={() => handleReject(req._id)}
                                            disabled={processingId === req._id}
                                        >
                                            {processingId === req._id ? 'Rejecting...' : 'Reject'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Completed / History */}
            <div>
                <h2 className="text-white text-xl font-semibold mb-4">
                    History
                    <span className="text-stone-400 text-sm font-normal ml-2">({completedRequests.length})</span>
                </h2>

                {completedRequests.length === 0 ? (
                    <div className="bg-stone-800 rounded-xl p-6 text-center">
                        <p className="text-stone-400">No completed password resets yet.</p>
                    </div>
                ) : (
                    <div className="bg-stone-800 rounded-xl overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                            <thead>
                                <tr className="bg-stone-700">
                                    <th className="text-left text-stone-300 px-4 py-3 font-medium">Organizer</th>
                                    <th className="text-left text-stone-300 px-4 py-3 font-medium">Email</th>
                                    <th className="text-left text-stone-300 px-4 py-3 font-medium">Status</th>
                                    <th className="text-left text-stone-300 px-4 py-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {completedRequests.map(req => (
                                    <tr key={req._id} className="border-t border-stone-700 hover:bg-stone-750">
                                        <td className="px-4 py-3 text-white">{req.organizerName}</td>
                                        <td className="px-4 py-3 text-stone-300 font-mono text-xs">{req.organizerEmail}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                req.status === 'completed'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-stone-400">
                                            {req.completedAt ? new Date(req.completedAt).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export { AdminPasswordResets }
