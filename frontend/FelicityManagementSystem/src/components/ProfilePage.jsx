import { useState, useContext, useEffect } from 'react'
import { UserContext } from '../contexts/UserContexts'
import { editProfile, changePassword } from '../services/participant'
import { requestPasswordReset, getPasswordResetStatus } from '../services/user'
import Button from './Button'
import Input from './Input'

function ProfilePage() {
    const { userData, updateUserData } = useContext(UserContext)
    const [editing, setEditing] = useState(false)
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [message, setMessage] = useState({ text: '', type: '' })
    const [saving, setSaving] = useState(false)

    // Participant fields
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [contactNumber, setContactNumber] = useState('')
    const [orgName, setOrgName] = useState('')
    const [interests, setInterests] = useState([])
    const [interestInput, setInterestInput] = useState('')

    // Organizer fields
    const [organizerName, setOrganizerName] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [contactEmail, setContactEmail] = useState('')
    const [discordWebhook, setDiscordWebhook] = useState('')

    // Password fields
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // Password reset request (Organizer)
    const [showResetRequest, setShowResetRequest] = useState(false)
    const [resetCurrentPassword, setResetCurrentPassword] = useState('')
    const [hasPendingReset, setHasPendingReset] = useState(false)
    const [submittingReset, setSubmittingReset] = useState(false)

    useEffect(() => {
        if (userData) {
            if (userData.role === 'Participant') {
                setFirstName(userData.firstName || '')
                setLastName(userData.lastName || '')
                setContactNumber(userData.contactNumber || '')
                setOrgName(userData.orgName || '')
                setInterests(userData.interests || [])
            } else if (userData.role === 'Organizer') {
                setOrganizerName(userData.organizerName || '')
                setDescription(userData.description || '')
                setCategory(userData.category || '')
                setContactEmail(userData.contactEmail || '')
                setDiscordWebhook(userData.discordWebhook || '')
                fetchResetStatus()
            }
        }
    }, [userData])

    const fetchResetStatus = async () => {
        try {
            const res = await getPasswordResetStatus()
            setHasPendingReset(res.data.hasPendingRequest)
        } catch (err) {
            console.error('Failed to fetch reset status:', err)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            setMessage({ text: '', type: '' })

            let data = {}
            if (userData.role === 'Participant') {
                data = { firstName, lastName, contactNumber, orgName, interests }
            } else if (userData.role === 'Organizer') {
                data = { organizerName, description, category, contactEmail, discordWebhook }
            }

            const res = await editProfile(data)
            updateUserData(res.data.response)
            setEditing(false)
            setMessage({ text: 'Profile updated successfully!', type: 'success' })
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Update failed.', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            setMessage({ text: 'Passwords do not match.', type: 'error' })
            return
        }
        if (newPassword.length < 8) {
            setMessage({ text: 'Password must be at least 8 characters.', type: 'error' })
            return
        }
        try {
            setSaving(true)
            setMessage({ text: '', type: '' })
            await changePassword({ currentPassword, newPassword })
            setMessage({ text: 'Password changed successfully!', type: 'success' })
            setShowPasswordForm(false)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Password change failed.', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const addInterest = () => {
        if (interestInput.trim() && !interests.includes(interestInput.trim())) {
            setInterests([...interests, interestInput.trim()])
            setInterestInput('')
        }
    }

    const handleRequestPasswordReset = async () => {
        if (!resetCurrentPassword) {
            setMessage({ text: 'Please enter your current password.', type: 'error' })
            return
        }
        try {
            setSubmittingReset(true)
            setMessage({ text: '', type: '' })
            await requestPasswordReset(resetCurrentPassword)
            setMessage({ text: 'Password reset request submitted. Waiting for Admin approval.', type: 'success' })
            setHasPendingReset(true)
            setShowResetRequest(false)
            setResetCurrentPassword('')
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Failed to submit request.', type: 'error' })
        } finally {
            setSubmittingReset(false)
        }
    }

    const removeInterest = (idx) => {
        setInterests(interests.filter((_, i) => i !== idx))
    }

    const categoryOptions = [
        "Technical", "Cultural", "Sports", "Literary",
        "Design", "Management", "Social/Community", "Gaming", "Fest Team", "Other"
    ]

    if (!userData || !userData.role) return null

    return (
        <div className="min-h-screen pb-10 px-4 sm:px-5">
            <div className="mx-auto max-w-2xl">
                <h1 className="text-white text-3xl py-5 font-semibold">Profile</h1>

                {message.text && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${
                        message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                        {message.text}
                    </div>
                )}

                <div className="bg-stone-800 rounded-xl p-6">
                    {/* Non-editable Fields */}
                    <div className="mb-6">
                        <h2 className="text-stone-400 text-sm font-medium mb-3 uppercase tracking-wider">Account Info</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-stone-700 rounded-lg p-4">
                                <p className="text-stone-400 text-xs mb-1">Email</p>
                                <p className="text-white">{userData.email}</p>
                            </div>
                            <div className="bg-stone-700 rounded-lg p-4">
                                <p className="text-stone-400 text-xs mb-1">Role</p>
                                <p className="text-white">{userData.role}</p>
                            </div>
                            {userData.role === 'Participant' && (
                                <div className="bg-stone-700 rounded-lg p-4">
                                    <p className="text-stone-400 text-xs mb-1">Participant Type</p>
                                    <p className="text-white">{userData.participantType}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-stone-400 text-sm font-medium uppercase tracking-wider">
                                {editing ? 'Edit Profile' : 'Profile Details'}
                            </h2>
                            {!editing && (
                                <Button
                                    variant="primary"
                                    isbaseStyles={false}
                                    className="px-4 py-1.5 text-sm"
                                    onClick={() => setEditing(true)}
                                >
                                    Edit
                                </Button>
                            )}
                        </div>

                        {userData.role === 'Participant' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Input
                                            label="First Name"
                                            name="firstName"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            disabled={!editing}
                                            className={!editing ? 'bg-stone-700 text-stone-300' : 'text-white'}
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            label="Last Name"
                                            name="lastName"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            disabled={!editing}
                                            className={!editing ? 'bg-stone-700 text-stone-300' : 'text-white'}
                                        />
                                    </div>
                                </div>
                                <Input
                                    label="Contact Number"
                                    name="contactNumber"
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    disabled={!editing}
                                    className={!editing ? 'bg-stone-700 text-stone-300' : 'text-white'}
                                />
                                <Input
                                    label="College / Organization Name"
                                    name="orgName"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    disabled={!editing}
                                    className={!editing ? 'bg-stone-700 text-stone-300' : 'text-white'}
                                />

                                {/* Interests */}
                                <div>
                                    <label className="text-white text-md font-medium mb-2 block">Interests</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {interests.map((interest, idx) => (
                                            <span key={idx} className="bg-orange-400/20 text-orange-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                                {interest}
                                                {editing && (
                                                    <button onClick={() => removeInterest(idx)} className="hover:text-red-400 cursor-pointer">×</button>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    {editing && (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={interestInput}
                                                onChange={(e) => setInterestInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addInterest()}
                                                placeholder="Add interest..."
                                                className="flex-1 px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:ring-2 focus:ring-orange-400 outline-none"
                                            />
                                            <Button variant="primary" isbaseStyles={false} className="px-4 py-2" onClick={addInterest}>
                                                Add
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {userData.role === 'Organizer' && (
                            <div className="space-y-4">
                                <Input
                                    label="Organizer Name"
                                    name="organizerName"
                                    value={organizerName}
                                    onChange={(e) => setOrganizerName(e.target.value)}
                                    disabled={!editing}
                                    className={`${!editing ? 'bg-stone-700 text-stone-300' : 'text-white'} `}
                                />
                                <div>
                                    <label className="text-white text-md font-medium mb-2 block">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        disabled={!editing}
                                        rows={4}
                                        className={`w-full px-4 py-2.5 border text-white overflow-y-auto border-gray-300 rounded-lg focus:ring-2 resize-none focus:ring-orange-400 focus:border-transparent outline-none ${
                                            !editing ? 'bg-stone-700 text-stone-300' : ''
                                        }`}
                                    />
                                </div>
                                <div>
                                    <label className="text-white text-md font-medium mb-2 block">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        disabled={!editing}
                                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-white cursor-pointer focus:ring-2 focus:ring-orange-400 outline-none ${
                                            !editing ? 'bg-stone-700 text-stone-300' : 'bg-stone-700'
                                        }`}
                                    >
                                        {categoryOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <Input
                                    label="Contact Email"
                                    name="contactEmail"
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    disabled={!editing}
                                    className={`${!editing ? 'bg-stone-700 text-stone-300' : ''} text-white`}
                                />
                                <Input
                                    label="Discord Webhook URL"
                                    name="discordWebhook"
                                    value={discordWebhook}
                                    onChange={(e) => setDiscordWebhook(e.target.value)}
                                    disabled={!editing}
                                    placeholder="Webhook URL (optional)"
                                    className={`${!editing ? 'bg-stone-700 text-stone-300' : ''} text-white`}
                                />
                            </div>
                        )}

                        {editing && (
                            <div className="flex gap-3 mt-6">
                                <Button variant="primary" isbaseStyles={false} className="px-6 py-2" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button
                                    variant="custom"
                                    isbaseStyles={false}
                                    className="px-6 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-500 cursor-pointer"
                                    onClick={() => setEditing(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Password Section */}
                    <div className="border-t border-stone-700 pt-6">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-stone-400 text-sm font-medium uppercase tracking-wider">Security</h2>
                            {userData.role === 'Participant' && !showPasswordForm && (
                                <Button
                                    variant="custom"
                                    isbaseStyles={false}
                                    className="px-4 py-1.5 text-sm bg-stone-600 text-white rounded-md hover:bg-stone-500 cursor-pointer"
                                    onClick={() => setShowPasswordForm(true)}
                                >
                                    Change Password
                                </Button>
                            )}
                        </div>

                        {/* Participant: Direct password change */}
                        {userData.role === 'Participant' && showPasswordForm && (
                            <div className="space-y-4">
                                <Input
                                    label="Current Password"
                                    name="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                                <Input
                                    label="New Password"
                                    name="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <Input
                                    label="Confirm New Password"
                                    name="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <div className="flex gap-3">
                                    <Button variant="primary" isbaseStyles={false} className="px-6 py-2" onClick={handlePasswordChange} disabled={saving}>
                                        {saving ? 'Changing...' : 'Change Password'}
                                    </Button>
                                    <Button
                                        variant="custom"
                                        isbaseStyles={false}
                                        className="px-6 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-500 cursor-pointer"
                                        onClick={() => {
                                            setShowPasswordForm(false)
                                            setCurrentPassword('')
                                            setNewPassword('')
                                            setConfirmPassword('')
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Organizer: Password reset request through Admin */}
                        {userData.role === 'Organizer' && (
                            <div>
                                {hasPendingReset ? (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-yellow-400 text-lg">⏳</span>
                                            <p className="text-yellow-400 font-semibold">Password Reset Pending</p>
                                        </div>
                                        <p className="text-stone-400 text-sm mt-1">
                                            Your password reset request is being reviewed by the Admin. You will be notified via email once processed.
                                        </p>
                                    </div>
                                ) : !showResetRequest ? (
                                    <div>
                                        <p className="text-stone-400 text-sm mb-3">
                                            Organizer passwords can only be changed by Admin. Submit a request to change your password.
                                        </p>
                                        <Button
                                            variant="custom"
                                            isbaseStyles={false}
                                            className="px-4 py-1.5 text-sm bg-stone-600 text-white rounded-md hover:bg-stone-500 cursor-pointer"
                                            onClick={() => setShowResetRequest(true)}
                                        >
                                            Request Password Reset
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-stone-400 text-sm">
                                            Enter your current password to verify your identity before submitting the request.
                                        </p>
                                        <Input
                                            label="Current Password"
                                            name="resetCurrentPassword"
                                            type="password"
                                            value={resetCurrentPassword}
                                            onChange={(e) => setResetCurrentPassword(e.target.value)}
                                            className="text-white"
                                        />
                                        <div className="flex gap-3">
                                            <Button
                                                variant="primary"
                                                isbaseStyles={false}
                                                className="px-6 py-2"
                                                onClick={handleRequestPasswordReset}
                                                disabled={submittingReset}
                                            >
                                                {submittingReset ? 'Submitting...' : 'Submit Request'}
                                            </Button>
                                            <Button
                                                variant="custom"
                                                isbaseStyles={false}
                                                className="px-6 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-500 cursor-pointer"
                                                onClick={() => {
                                                    setShowResetRequest(false)
                                                    setResetCurrentPassword('')
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProfilePage
