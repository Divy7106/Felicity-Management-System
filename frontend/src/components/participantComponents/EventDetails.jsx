import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEventDetails, registerForEvent, purchaseMerchandise } from '../../services/participant'
import { createTeam, exportCalendar, getGoogleCalendarUrl, getOutlookCalendarUrl } from '../../services/participant'
import Button from '../Button'

function EventDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [registering, setRegistering] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [formResponses, setFormResponses] = useState({})
    const [merchSelections, setMerchSelections] = useState([])
    const [message, setMessage] = useState({ text: '', type: '' })
    const [ticketInfo, setTicketInfo] = useState(null)
    const [formErrors, setFormErrors] = useState({})
    const [fileUploads, setFileUploads] = useState({})

    // Team registration state
    const [showTeamForm, setShowTeamForm] = useState(false)
    const [teamName, setTeamName] = useState('')
    const [memberEmails, setMemberEmails] = useState([''])

    const baseUrl = import.meta.env.VITE_BASE_BACKEND_URL || ''

    useEffect(() => {
        fetchEvent()
    }, [id])

    const fetchEvent = async () => {
        try {
            setLoading(true)
            const res = await getEventDetails(id)
            setEvent(res.data.response)
            // Set ticket info if user is already registered
            if (res.data.response.ticketInfo) {
                setTicketInfo(res.data.response.ticketInfo)
            }
        } catch (err) {
            console.error('Failed to get event:', err)
            setMessage({ text: 'Failed to load event details.', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const validateForm = () => {
        const errors = {}
        const requiredFields = event.formFields?.filter(field => field.isRequired && field.fieldType !== 'note')
        
        requiredFields?.forEach(field => {
            if (field.fieldType === 'file') {
                if (!fileUploads[field.fieldId]) {
                    errors[field.fieldId] = `${field.label} is required`
                }
            } else if (field.fieldType === 'checkbox') {
                const value = formResponses[field.fieldId]
                if (!value || !Array.isArray(value) || value.length === 0) {
                    errors[field.fieldId] = `${field.label} is required`
                }
            } else {
                const value = formResponses[field.fieldId]
                if (!value || value.trim() === '') {
                    errors[field.fieldId] = `${field.label} is required`
                }
            }
        })
        
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleNormalRegister = async () => {
        // Validate form if there are form fields
        if (event.formFields?.length > 0 && !validateForm()) {
            setMessage({ text: 'Please fill in all required fields.', type: 'error' })
            return
        }
        
        try {
            setRegistering(true)
            setMessage({ text: '', type: '' })
            setFormErrors({})
            const res = await registerForEvent(id, formResponses, fileUploads)
            setTicketInfo(res.data.registration)
            setMessage({ text: 'Registration successful! Check your email.', type: 'success' })
            setShowForm(false)
            fetchEvent()
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Registration failed.', type: 'error' })
        } finally {
            setRegistering(false)
        }
    }

    const handleMerchPurchase = async () => {
        if (merchSelections.length === 0) {
            setMessage({ text: 'Please select at least one item.', type: 'error' })
            return
        }
        try {
            setRegistering(true)
            setMessage({ text: '', type: '' })
            const res = await purchaseMerchandise(id, merchSelections)
            setTicketInfo(res.data.registration)
            setMessage({ text: 'Purchase successful! Check your email.', type: 'success' })
            fetchEvent()
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Purchase failed.', type: 'error' })
        } finally {
            setRegistering(false)
        }
    }

    // Team registration handler
    const handleTeamRegister = async () => {
        if (!teamName.trim()) {
            setMessage({ text: 'Please enter a team name.', type: 'error' })
            return
        }
        const validEmails = memberEmails.filter(e => e.trim())
        if (validEmails.length === 0) {
            setMessage({ text: 'Please add at least one team member email.', type: 'error' })
            return
        }
        try {
            setRegistering(true)
            setMessage({ text: '', type: '' })
            const res = await createTeam(id, {
                teamName: teamName.trim(),
                memberEmails: validEmails,
                formResponses,
            }, fileUploads)
            setMessage({ text: res.data.msg || 'Team created! Invitations sent.', type: 'success' })
            setShowTeamForm(false)
            setTeamName('')
            setMemberEmails([''])
            fetchEvent()
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Team creation failed.', type: 'error' })
        } finally {
            setRegistering(false)
        }
    }

    const handleCalendarExport = async () => {
        try {
            const res = await exportCalendar(id)
            const blob = new Blob([res.data], { type: 'text/calendar' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${event.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.ics`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Calendar export failed:', err)
        }
    }

    const addMerchSelection = (itemId, variantId) => {
        const exists = merchSelections.find(s => s.itemId === itemId && s.variantId === variantId)
        if (exists) {
            setMerchSelections(merchSelections.filter(s => !(s.itemId === itemId && s.variantId === variantId)))
        } else {
            setMerchSelections([...merchSelections, { itemId, variantId, quantity: 1 }])
        }
    }

    const updateMerchQty = (itemId, variantId, qty) => {
        setMerchSelections(merchSelections.map(s =>
            s.itemId === itemId && s.variantId === variantId ? { ...s, quantity: parseInt(qty) || 1 } : s
        ))
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-white text-2xl">Loading event...</p>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-4">
                <p className="text-red-400 text-2xl">Event not found.</p>
                <Button variant="primary" isbaseStyles={false} className="px-6 py-2" onClick={() => navigate('/browse-events')}>
                    Back to Events
                </Button>
            </div>
        )
    }

    const canRegister = !event.isRegistered && !event.deadlinePassed && !event.isFull

    return (
        <div className="min-h-screen pb-10 px-3 sm:px-5">
            <button
                onClick={() => navigate('/browse-events')}
                className="text-orange-400 hover:text-orange-300 mb-3 flex items-center gap-1 cursor-pointer"
            >
                ← Back to Events
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    {/* Cover Image */}
                    <div className="relative h-48 sm:h-72 rounded-xl overflow-hidden bg-stone-800 mb-6">
                        {event.coverImage ? (
                            <img src={baseUrl + event.coverImage} alt={event.eventName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-500 text-lg">No Image</div>
                        )}
                        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-semibold text-white ${
                            event.eventType === 'Normal' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}>
                            {event.eventType}
                        </div>
                    </div>

                    {/* Event Info */}
                    <div className="bg-stone-800 rounded-xl p-4 sm:p-6">
                        <h1 className="text-white text-2xl sm:text-3xl font-bold mb-2">{event.eventName}</h1>
                        <p className="text-orange-400 text-lg mb-4">by {event.organizerName}</p>

                        <p className="text-stone-300 text-base leading-relaxed mb-6">{event.eventDescription}</p>

                        {/* Tags */}
                        {event.eventTags?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                {event.eventTags.map((tag, i) => (
                                    <span key={i} className="text-xs bg-stone-700 text-stone-300 px-3 py-1 rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <div className="bg-stone-700 rounded-lg p-4">
                                <p className="text-stone-400 text-sm">Registration Deadline</p>
                                <p className={`font-semibold ${event.deadlinePassed ? 'text-red-400' : 'text-white'}`}>
                                    {new Date(event.registrationDeadline).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-stone-700 rounded-lg p-4">
                                <p className="text-stone-400 text-sm">Start Date</p>
                                <p className="text-white font-semibold">{new Date(event.eventStartDate).toLocaleString()}</p>
                            </div>
                            <div className="bg-stone-700 rounded-lg p-4">
                                <p className="text-stone-400 text-sm">End Date</p>
                                <p className="text-white font-semibold">{new Date(event.eventEndDate).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Merchandise Items */}
                    {event.eventType === 'Merchandise' && event.merchandiseItems && (
                        <div className="bg-stone-800 rounded-xl p-6 mt-6">
                            <h2 className="text-white text-2xl font-semibold mb-4">Merchandise Items</h2>
                            <div className="space-y-4">
                                {event.merchandiseItems.map((item) => (
                                    <div key={item.itemId} className="bg-stone-700 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-white text-lg font-semibold">{item.name}</h3>
                                            <span className="text-orange-400 font-bold">₹{item.basePrice}</span>
                                        </div>
                                        <p className="text-stone-400 text-sm mb-3">Max {item.perParticipantLimit} per person</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {item.variants.map((variant) => {
                                                const isSelected = merchSelections.some(
                                                    s => s.itemId === item.itemId && s.variantId === variant.variantId
                                                )
                                                const sel = merchSelections.find(
                                                    s => s.itemId === item.itemId && s.variantId === variant.variantId
                                                )
                                                return (
                                                    <div
                                                        key={variant.variantId}
                                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'border-orange-400 bg-orange-400/10'
                                                                : 'border-stone-600 hover:border-stone-500'
                                                        } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        onClick={() => variant.stock > 0 && canRegister && addMerchSelection(item.itemId, variant.variantId)}
                                                    >
                                                        {variant.coverImage && (
                                                            <img
                                                                src={baseUrl + variant.coverImage}
                                                                alt=""
                                                                className="w-12 h-12 rounded object-cover"
                                                            />
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="text-white text-sm">{variant.size} / {variant.color}</p>
                                                            <p className={`text-xs ${variant.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                                                            </p>
                                                        </div>
                                                        {isSelected && (
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={Math.min(item.perParticipantLimit, variant.stock)}
                                                                value={sel?.quantity || 1}
                                                                onChange={(e) => {
                                                                    e.stopPropagation()
                                                                    updateMerchQty(item.itemId, variant.variantId, e.target.value)
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-16 bg-stone-800 text-white text-center px-2 py-1 rounded border border-stone-500"
                                                            />
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Registration Form for Normal Events */}
                    {showForm && event.eventType === 'Normal' && event.formFields?.length > 0 && !event.allowTeamRegistration && (
                        <div className="bg-stone-800 rounded-xl p-6 mt-6">
                            <h2 className="text-white text-2xl font-semibold mb-4">Registration Form</h2>
                            <div className="space-y-4">
                                {event.formFields
                                    .sort((a, b) => a.fieldId - b.fieldId)
                                    .map((field) => (
                                        <div key={field.fieldId}>
                                            <label className="text-white text-sm font-medium mb-1 block">
                                                {field.label} {field.isRequired && <span className="text-orange-500">*</span>}
                                            </label>
                                            {field.fieldType === 'text' && (
                                                <>
                                                    <input
                                                        type="text"
                                                        placeholder={field.placeholder || ''}
                                                        value={formResponses[field.fieldId] || ''}
                                                        onChange={(e) => {
                                                            setFormResponses({ ...formResponses, [field.fieldId]: e.target.value })
                                                            if (formErrors[field.fieldId]) {
                                                                setFormErrors({ ...formErrors, [field.fieldId]: null })
                                                            }
                                                        }}
                                                        className={`w-full px-4 py-2.5 bg-stone-700 border rounded-lg text-white focus:ring-2 focus:ring-orange-400 outline-none ${
                                                            formErrors[field.fieldId] ? 'border-red-500' : 'border-stone-600'
                                                        }`}
                                                        required={field.isRequired}
                                                    />
                                                    {formErrors[field.fieldId] && (
                                                        <p className="text-red-400 text-xs mt-1">{formErrors[field.fieldId]}</p>
                                                    )}
                                                </>
                                            )}
                                            {field.fieldType === 'dropdown' && (
                                                <>
                                                    <select
                                                        value={formResponses[field.fieldId] || ''}
                                                        onChange={(e) => {
                                                            setFormResponses({ ...formResponses, [field.fieldId]: e.target.value })
                                                            if (formErrors[field.fieldId]) {
                                                                setFormErrors({ ...formErrors, [field.fieldId]: null })
                                                            }
                                                        }}
                                                        className={`w-full px-4 py-2.5 bg-stone-700 border rounded-lg text-white cursor-pointer ${
                                                            formErrors[field.fieldId] ? 'border-red-500' : 'border-stone-600'
                                                        }`}
                                                        required={field.isRequired}
                                                    >
                                                        <option value="">Select...</option>
                                                        {(field.options || []).map((opt, i) => (
                                                            <option key={i} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                    {formErrors[field.fieldId] && (
                                                        <p className="text-red-400 text-xs mt-1">{formErrors[field.fieldId]}</p>
                                                    )}
                                                </>
                                            )}
                                            {field.fieldType === 'checkbox' && (
                                                <>
                                                    <div className="flex flex-wrap gap-3">
                                                        {(field.options || []).map((opt, i) => (
                                                            <label key={i} className="flex items-center gap-2 text-stone-300 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={(formResponses[field.fieldId] || []).includes(opt)}
                                                                    onChange={(e) => {
                                                                        const current = formResponses[field.fieldId] || []
                                                                        const updated = e.target.checked
                                                                            ? [...current, opt]
                                                                            : current.filter(v => v !== opt)
                                                                        setFormResponses({ ...formResponses, [field.fieldId]: updated })
                                                                        if (formErrors[field.fieldId] && updated.length > 0) {
                                                                            setFormErrors({ ...formErrors, [field.fieldId]: null })
                                                                        }
                                                                    }}
                                                                    className="accent-orange-400"
                                                                />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {formErrors[field.fieldId] && (
                                                        <p className="text-red-400 text-xs mt-1">{formErrors[field.fieldId]}</p>
                                                    )}
                                                </>
                                            )}
                                            {field.fieldType === 'file' && (
                                                <>
                                                    <input
                                                        type="file"
                                                        accept={field.allowedFileFormats?.map(f => `.${f}`).join(',') || '*'}
                                                        onChange={(e) => {
                                                            const file = e.target.files[0]
                                                            if (file) {
                                                                setFileUploads({ ...fileUploads, [field.fieldId]: file })
                                                                if (formErrors[field.fieldId]) {
                                                                    setFormErrors({ ...formErrors, [field.fieldId]: null })
                                                                }
                                                            }
                                                        }}
                                                        className={`w-full px-4 py-2.5 bg-stone-700 border rounded-lg text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-orange-400 file:text-white hover:file:bg-orange-500 ${
                                                            formErrors[field.fieldId] ? 'border-red-500' : 'border-stone-600'
                                                        }`}
                                                    />
                                                    {field.allowedFileFormats?.length > 0 && (
                                                        <p className="text-stone-500 text-xs mt-1">Allowed: {field.allowedFileFormats.join(', ')}</p>
                                                    )}
                                                    {fileUploads[field.fieldId] && (
                                                        <p className="text-green-400 text-xs mt-1">Selected: {fileUploads[field.fieldId].name}</p>
                                                    )}
                                                    {formErrors[field.fieldId] && (
                                                        <p className="text-red-400 text-xs mt-1">{formErrors[field.fieldId]}</p>
                                                    )}
                                                </>
                                            )}
                                            {field.fieldType === 'note' && (
                                                <p className="text-stone-400 text-sm italic">{field.placeholder || field.label}</p>
                                            )}
                                        </div>
                                    ))}
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="primary"
                                    isbaseStyles={false}
                                    className="px-6 py-2"
                                    onClick={handleNormalRegister}
                                    disabled={registering}
                                >
                                    {registering ? 'Registering...' : 'Submit Registration'}
                                </Button>
                                <Button
                                    variant="custom"
                                    isbaseStyles={false}
                                    className="px-6 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-500"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Team Registration Form */}
                    {showTeamForm && event.allowTeamRegistration && (
                        <div className="bg-stone-800 rounded-xl p-4 sm:p-6 mt-6">
                            <h2 className="text-white text-2xl font-semibold mb-4">Team Registration</h2>
                            <p className="text-stone-400 text-sm mb-4">
                                Create a team ({event.minTeamSize}-{event.maxTeamSize} members including you). You'll be the team leader.
                            </p>

                            <div className="mb-4">
                                <label className="text-white text-sm font-medium mb-1 block">Team Name <span className="text-orange-500">*</span></label>
                                <input
                                    type="text"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="Enter team name"
                                    maxLength={30}
                                    className="w-full px-4 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 outline-none"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="text-white text-sm font-medium mb-2 block">
                                    Team Members (emails) <span className="text-orange-500">*</span>
                                </label>
                                <p className="text-stone-500 text-xs mb-3">Add {event.minTeamSize - 1} to {event.maxTeamSize - 1} member emails (excluding you)</p>
                                {memberEmails.map((email, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => {
                                                const updated = [...memberEmails]
                                                updated[idx] = e.target.value
                                                setMemberEmails(updated)
                                            }}
                                            placeholder={`Member ${idx + 1} email`}
                                            className="flex-1 px-4 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 outline-none"
                                        />
                                        {memberEmails.length > 1 && (
                                            <button
                                                onClick={() => setMemberEmails(memberEmails.filter((_, i) => i !== idx))}
                                                className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {memberEmails.length < event.maxTeamSize - 1 && (
                                    <button
                                        onClick={() => setMemberEmails([...memberEmails, ''])}
                                        className="text-orange-400 hover:text-orange-300 text-sm mt-1 cursor-pointer"
                                    >
                                        + Add another member
                                    </button>
                                )}
                            </div>

                            {/* Show registration form fields if any */}
                            {event.formFields?.length > 0 && (
                                <div className="mb-4 border-t border-stone-700 pt-4">
                                    <h3 className="text-white text-lg font-medium mb-3">Additional Information</h3>
                                    <div className="space-y-3">
                                        {event.formFields.sort((a, b) => a.fieldId - b.fieldId).map((field) => (
                                            <div key={field.fieldId}>
                                                <label className="text-white text-sm font-medium mb-1 block">
                                                    {field.label} {field.isRequired && <span className="text-orange-500">*</span>}
                                                </label>
                                                {field.fieldType === 'text' && (
                                                    <input
                                                        type="text"
                                                        placeholder={field.placeholder || ''}
                                                        value={formResponses[field.fieldId] || ''}
                                                        onChange={(e) => setFormResponses({ ...formResponses, [field.fieldId]: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 outline-none"
                                                    />
                                                )}
                                                {field.fieldType === 'dropdown' && (
                                                    <select
                                                        value={formResponses[field.fieldId] || ''}
                                                        onChange={(e) => setFormResponses({ ...formResponses, [field.fieldId]: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white cursor-pointer"
                                                    >
                                                        <option value="">Select...</option>
                                                        {(field.options || []).map((opt, i) => (
                                                            <option key={i} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {field.fieldType === 'checkbox' && (
                                                    <div className="flex flex-wrap gap-3">
                                                        {(field.options || []).map((opt, i) => (
                                                            <label key={i} className="flex items-center gap-2 text-stone-300 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={(formResponses[field.fieldId] || []).includes(opt)}
                                                                    onChange={(e) => {
                                                                        const current = formResponses[field.fieldId] || []
                                                                        const updated = e.target.checked
                                                                            ? [...current, opt]
                                                                            : current.filter(v => v !== opt)
                                                                        setFormResponses({ ...formResponses, [field.fieldId]: updated })
                                                                    }}
                                                                    className="accent-orange-400"
                                                                />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                                {field.fieldType === 'file' && (
                                                    <>
                                                        <input
                                                            type="file"
                                                            accept={field.allowedFileFormats?.map(f => `.${f}`).join(',') || '*'}
                                                            onChange={(e) => {
                                                                const file = e.target.files[0]
                                                                if (file) {
                                                                    setFileUploads({ ...fileUploads, [field.fieldId]: file })
                                                                }
                                                            }}
                                                            className="w-full px-4 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-orange-400 file:text-white hover:file:bg-orange-500"
                                                        />
                                                        {field.allowedFileFormats?.length > 0 && (
                                                            <p className="text-stone-500 text-xs mt-1">Allowed: {field.allowedFileFormats.join(', ')}</p>
                                                        )}
                                                        {fileUploads[field.fieldId] && (
                                                            <p className="text-green-400 text-xs mt-1">Selected: {fileUploads[field.fieldId].name}</p>
                                                        )}
                                                    </>
                                                )}
                                                {field.fieldType === 'note' && (
                                                    <p className="text-stone-400 text-sm italic">{field.placeholder || field.label}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-4">
                                <Button
                                    variant="primary"
                                    isbaseStyles={false}
                                    className="px-6 py-2"
                                    onClick={handleTeamRegister}
                                    disabled={registering}
                                >
                                    {registering ? 'Creating...' : 'Create Team & Send Invites'}
                                </Button>
                                <Button
                                    variant="custom"
                                    isbaseStyles={false}
                                    className="px-6 py-2 bg-stone-600 text-white rounded-md hover:bg-stone-500"
                                    onClick={() => setShowTeamForm(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 sticky">
                    <div className="bg-stone-800 rounded-xl p-6 top-5">
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-stone-400">Fee</span>
                                <span className="text-white text-xl font-bold">
                                    {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-400">Eligibility</span>
                                <span className="text-white">{event.eligibility}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-400">Registrations</span>
                                <span className="text-white">{event.registrationCount} / {event.registrationLimit}</span>
                            </div>

                            <div className="border-t border-stone-700 pt-4">
                                {event.isRegistered && event.ticketInfo?.status !== 'cancelled' ? (
                                    <div className="text-center">
                                        <p className="text-green-400 font-semibold mb-2">✓ Already Registered</p>
                                        <p className="text-stone-400 text-sm">Ticket: {event.existingTicketId}</p>
                                    </div>
                                ) : event.isRegistered && event.ticketInfo?.status === 'cancelled' ? (
                                    <div className="text-center">
                                        <p className="text-red-400 font-semibold mb-2">✗ Registration Cancelled</p>
                                        <p className="text-stone-500 text-sm">Your registration for this event has been cancelled.</p>
                                    </div>
                                ) : event.deadlinePassed ? (
                                    <p className="text-red-400 text-center font-semibold">Registration Closed</p>
                                ) : event.isFull ? (
                                    <p className="text-red-400 text-center font-semibold">Registration Full</p>
                                ) : event.eventType === 'Normal' ? (
                                    event.allowTeamRegistration ? (
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="primary"
                                                isbaseStyles={false}
                                                className="w-full py-3 text-lg"
                                                onClick={() => setShowTeamForm(true)}
                                                disabled={registering}
                                            >
                                                Register as Team
                                            </Button>
                                            {(event.minTeamSize <= 1) && (
                                                <Button
                                                    variant="custom"
                                                    isbaseStyles={false}
                                                    className="w-full py-2 text-sm bg-stone-600 text-white rounded-md hover:bg-stone-500"
                                                    onClick={() => {
                                                        if (event.formFields?.length > 0) {
                                                            setShowForm(true)
                                                        } else {
                                                            handleNormalRegister()
                                                        }
                                                    }}
                                                    disabled={registering}
                                                >
                                                    Register Individually
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <Button
                                            variant="primary"
                                            isbaseStyles={false}
                                            className="w-full py-3 text-lg"
                                            onClick={() => {
                                                if (event.formFields?.length > 0) {
                                                    setShowForm(true)
                                                } else {
                                                    handleNormalRegister()
                                                }
                                            }}
                                            disabled={registering}
                                        >
                                            {registering ? 'Registering...' : 'Register Now'}
                                        </Button>
                                    )
                                ) : (
                                    <Button
                                        variant="primary"
                                        isbaseStyles={false}
                                        className="w-full py-3 text-lg"
                                        onClick={handleMerchPurchase}
                                        disabled={registering || merchSelections.length === 0}
                                    >
                                        {registering ? 'Processing...' : `Purchase (${merchSelections.length} items)`}
                                    </Button>
                                )}
                            </div>

                            {/* Messages */}
                            {message.text && (
                                <p className={`text-center text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                    {message.text}
                                </p>
                            )}

                            {/* Organizer Link */}
                            <div className="border-t border-stone-700 pt-4">
                                <p className="text-stone-400 text-sm mb-1">Organized by</p>
                                <button
                                    onClick={() => navigate(`/organizer/${event.organizerId}`)}
                                    className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
                                >
                                    {event.organizerName}
                                </button>
                                {event.organizerCategory && (
                                    <p className="text-stone-500 text-xs mt-1">{event.organizerCategory}</p>
                                )}
                            </div>

                            {/* Add to Calendar */}
                            <div className="border-t border-stone-700 pt-4">
                                <p className="text-stone-400 text-sm mb-2">Add to Calendar</p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleCalendarExport}
                                        className="text-left text-sm text-orange-400 hover:text-orange-300 cursor-pointer flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download .ics File
                                    </button>
                                    <a
                                        href={getGoogleCalendarUrl(event)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Google Calendar
                                    </a>
                                    <a
                                        href={getOutlookCalendarUrl(event)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Outlook Calendar
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ticket Info after registration */}
                    {ticketInfo && (
                        <div className={`bg-stone-800 rounded-xl p-6 mt-4 border ${ticketInfo.status === 'cancelled' ? 'border-red-500/30' : 'border-green-500/30'}`}>
                            <h3 className={`${ticketInfo.status === 'cancelled' ? 'text-red-400' : 'text-green-400'} font-semibold text-lg mb-3`}>
                                {ticketInfo.status === 'cancelled' ? '✗ Registration Cancelled' : '🎟 Your Ticket'}
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-stone-400">Ticket ID</span>
                                    <span className={`font-mono ${ticketInfo.status === 'cancelled' ? 'text-stone-500 line-through' : 'text-orange-400'}`}>{ticketInfo.ticketId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-400">Status</span>
                                    <span className={`${ticketInfo.status === 'cancelled' ? 'text-red-400' : 'text-green-400'}`}>{ticketInfo.status || 'confirmed'}</span>
                                </div>
                                {ticketInfo.status === 'cancelled' && (
                                    <p className="text-red-400/80 text-sm mt-2">Your registration for this event has been cancelled. Your ticket and QR code are no longer valid.</p>
                                )}
                                {ticketInfo.qrCode && ticketInfo.status !== 'cancelled' && (
                                    <div className="flex justify-center mt-4 p-4 bg-white rounded-lg">
                                        {ticketInfo.qrCode.startsWith('data:image') ? (
                                            <img 
                                                src={ticketInfo.qrCode} 
                                                alt="QR Code" 
                                                className="w-full max-w-50 h-auto"
                                            />
                                        ) : (
                                            <div className="w-48 h-48 bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center rounded">
                                                <span className="text-stone-500 text-xs">QR Code Not Available</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Team Info after registration */}
                    {event.teamInfo && (
                        <div className="bg-stone-800 rounded-xl p-6 mt-4 border border-purple-500/30">
                            <h3 className="text-purple-400 font-semibold text-lg mb-3">👥 Your Team</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-stone-400">Team Name</span>
                                    <span className="text-white font-medium">{event.teamInfo.teamName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-400">Team Leader</span>
                                    <span className="text-orange-400">{event.teamInfo.leaderName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-400">Status</span>
                                    <span className={`text-sm font-medium ${
                                        event.teamInfo.status === 'cancelled' ? 'text-red-400' :
                                        event.teamInfo.teamStatus === 'complete' ? 'text-green-400' :
                                        event.teamInfo.teamStatus === 'incomplete' ? 'text-red-400' :
                                        'text-yellow-400'
                                    }`}>{event.teamInfo.status === 'cancelled' ? 'cancelled' : event.teamInfo.teamStatus}</span>
                                </div>

                                <div className="border-t border-stone-700 pt-3 mt-3">
                                    <p className="text-stone-400 text-sm mb-2">Team Members</p>
                                    <div className="space-y-1.5">
                                        {event.teamInfo.teamMembers.map((m, i) => (
                                            <div key={i} className="flex items-center justify-between bg-stone-700 rounded-lg px-3 py-2">
                                                <div className="min-w-0">
                                                    <p className="text-white text-sm truncate">{m.name}</p>
                                                    <p className="text-stone-500 text-xs truncate">{m.email}</p>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                                                    m.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                                    m.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                    {m.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {event.teamInfo.teamStatus === 'complete' && event.teamInfo.status !== 'cancelled' && (
                                    <button
                                        onClick={() => navigate(`/team-chat/${event.teamInfo.teamRegId}`)}
                                        className="w-full mt-3 px-4 py-2 bg-orange-400/10 text-orange-400 rounded-lg hover:bg-orange-400/20 transition-colors text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        Open Team Chat
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default EventDetails
