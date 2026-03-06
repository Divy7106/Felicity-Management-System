import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Input from "../Input";
import TextArea from "../TextArea";
import Button from "../Button";
import FormBuilder from "./FormBuilder";
import { getOrgMaxEvent, editEventForm } from "../../services/events";
import { UserContext } from "../../contexts/UserContexts";
import { closeEvent } from "../../services/participant";

function EditEventForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData } = useContext(UserContext);

    const [loading, setLoading] = useState(true);
    const [eventData, setEventData] = useState(null);
    const [isFormLocked, setIsFormLocked] = useState(false);
    const [isEventStarted, setIsEventStarted] = useState(false);
    const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);

    const [regForm, setRegForm] = useState([]);

    const [formData, setFormData] = useState({
        eventDescription: "",
        registrationDeadline: "",
        registrationLimit: 100
    });

    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (id && userData?._id) {
            fetchEventData();
        }
    }, [id, userData?._id]);

    const fetchEventData = async () => {
        try {
            setLoading(true);
            const response = await getOrgMaxEvent(id);
            const event = response.data.response;

            if (event.organizerId !== userData._id) {
                setMessage({ text: 'You do not have permission to edit this event.', type: 'error' });
                setTimeout(() => navigate('/organizer-dashboard'), 2000);
                return;
            }

            const locked = event.formLocked || false;
            setIsFormLocked(locked);

            const currentDate = new Date();
            const startDate = new Date(event.eventStartDate);
            const endDate = new Date(event.eventEndDate);

            const eventStarted = currentDate >= startDate;
            setIsEventStarted(eventStarted);

            const regClosed = new Date(event.registrationDeadline) < currentDate;
            setIsRegistrationClosed(regClosed);

            var status = null;
            if (currentDate < startDate) {
                status = 'Published';
            } else if (currentDate >= startDate && currentDate <= endDate) {
                status = 'OnGoing';
            } else {
                status = 'Closed';
            }

            if (eventStarted) {
                setMessage({ text: status === 'Closed' ? 'Event is closed. Editing is disabled.' : 'Event has started. Editing is disabled.', type: 'warning' });
            } else if (regClosed) {
                setMessage({ text: 'Registration is closed. Editing is disabled.', type: 'warning' });
            } else if (locked) {
                setMessage({ text: 'Registration form is locked (first registration received). Other fields can still be edited.', type: 'warning' });
            }

            event.status = status;

            setEventData(event);
            setRegForm(event.formFields || []);
            setFormData({
                eventDescription: event.eventdescription || "",
                registrationDeadline: event.registrationDeadline ? (new Date(new Date(event.registrationDeadline).getTime() + 5.5 * 60 * 60 * 1000)).toISOString().slice(0, 16) : "",
                registrationLimit: event.registrationLimit || 100
            });

            setLoading(false);
        } catch (error) {
            console.error('Error loading event:', error);
            setMessage({ text: 'Failed to load event: ' + (error.response?.data?.msg || error.message), type: 'error' });
            setTimeout(() => navigate('/organizer-dashboard'), 2000);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === 'registrationLimit') {
            newValue = value === '' ? '' : Math.round(Number(value));
            if (newValue < 0) newValue = -newValue;
            if (newValue > 5000) newValue = Math.round(newValue / 10);
        }

        setFormData(prev => ({ ...prev, [name]: newValue }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (closeRegistration = false) => {
        let validationErrors = {};

        // Event Description validation (50-500 characters)
        if (!formData.eventDescription || formData.eventDescription.length < 50 || formData.eventDescription.length > 500) {
            validationErrors.eventDescription = "Event Description must be at least 50 characters and at most 500 characters long.";
        }

        // Registration deadline validation
        const regDeadline = new Date(formData.registrationDeadline);
        const startDate = new Date(eventData.eventStartDate);

        if (!closeRegistration) {
            if (!formData.registrationDeadline || isNaN(regDeadline)) {
                validationErrors.registrationDeadline = "Registration Deadline must be a valid date.";
            }

            // Registration deadline must be before event start date
            if (regDeadline >= startDate) {
                validationErrors.registrationDeadline = "Registration Deadline must be before Event Start Date.";
            }

            // Can only extend deadline, not reduce it
            const originalDeadline = new Date(eventData.registrationDeadline);
            console.log(originalDeadline)
            console.log(regDeadline)
            if (regDeadline < originalDeadline) {
                validationErrors.registrationDeadline = "You can only extend the registration deadline, not reduce it.";
            }
        }

        // Registration limit validation (must be >= current limit)
        if (typeof formData.registrationLimit !== 'number' || formData.registrationLimit < 25 || formData.registrationLimit > 5000) {
            validationErrors.registrationLimit = "Registration Limit must be between 25 and 5000.";
        }

        const originalLimit = eventData.registrationLimit || 0;
        if (formData.registrationLimit < originalLimit) {
            validationErrors.registrationLimit = "You can only increase the registration limit, not decrease it.";
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        // Prepare update data
        const updateData = {
            eventDescription: formData.eventDescription,
            registrationDeadline: closeRegistration ? new Date().toISOString() : formData.registrationDeadline,
            registrationLimit: formData.registrationLimit,
            closeRegistration: closeRegistration
        };

        // Include formFields only if form is not locked
        if (!isFormLocked) {
            updateData.formFields = regForm;
        }

        try {
            await editEventForm(id, updateData);
            if (closeRegistration) {
                setMessage({ text: 'Event updated and registration closed successfully!', type: 'success' });
                setIsRegistrationClosed(true);
                fetchEventData();
            } else {
                setMessage({ text: 'Event updated successfully!', type: 'success' });
                setTimeout(() => navigate('/organizer-dashboard'), 2000);
            }
        } catch (err) {
            console.error('Error updating event:', err);
            setErrors(prev => ({ ...prev, backendError: err.response?.data?.error || 'Failed to update event' }));
        }
    };

    const handleCloseEvent = async () => {
        try {
            setMessage({ text: '', type: '' })
            await closeEvent(id)
            setMessage({ text: `Event closed successfully.`, type: 'success' })
            fetchEventData()
        } catch (err) {
            setMessage({ text: err.response?.data?.msg || 'Failed.', type: 'error' })
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-white text-xl">Loading event data...</div>
            </div>
        );
    }

    if (!eventData) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
                <p className="text-red-400 text-2xl">Event not found.</p>
                <Button variant="primary" isbaseStyles={false} className="px-6 py-2" onClick={() => navigate('/organizer-dashboard')}>
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    const isEditingDisabled = isEventStarted || isRegistrationClosed;

    return (
        <div className="w-full px-4 lg:px-8 pb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 sm:px-5 py-4 gap-2">
                <h1 className="text-white text-2xl sm:text-3xl">Edit Event</h1>
                <button
                    onClick={() => navigate('/organizer-dashboard')}
                    className="text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                    ← Back to Dashboard
                </button>
            </div>

            {message.text && (
                <div className={`mx-5 mb-4 p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-400' :
                    message.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Non-Editable Fields Display */}
            <div className="bg-stone-800 mx-2 sm:mx-5 mb-5 rounded-xl p-4 sm:p-6">
                <h2 className="text-white text-xl sm:text-2xl mb-4 font-semibold">Event Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Event Name */}
                    <div className="bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-1">Event Name</p>
                        <p className="text-white text-lg font-medium">{eventData.eventName}</p>
                    </div>

                    {/* Event Type */}
                    <div className="bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-1">Event Type</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${eventData.eventType === 'Normal' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                            }`}>
                            {eventData.eventType}
                        </span>
                    </div>

                    {/* Eligibility */}
                    <div className="bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-1">Eligibility</p>
                        <p className="text-white text-lg font-medium">{eventData.eligibility}</p>
                    </div>

                    {/* Registration Fee */}
                    <div className="bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-1">Registration Fee</p>
                        <p className="text-white text-lg font-medium">₹{eventData.registrationFee || 0}</p>
                    </div>

                    {/* Event Start Date */}
                    <div className="bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-1">Event Start Date</p>
                        <p className="text-white text-lg font-medium">
                            {new Date(eventData.eventStartDate).toLocaleString()}
                        </p>
                    </div>

                    {/* Event End Date */}
                    <div className="bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-1">Event End Date</p>
                        <p className="text-white text-lg font-medium">
                            {new Date(eventData.eventEndDate).toLocaleString()}
                        </p>
                    </div>

                    {/* Event Status */}
                    <div className="bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-1">Status</p>
                        <p className="text-white text-lg font-medium capitalize">{eventData.status}</p>
                    </div>

                    {/* Event Tags */}
                    <div className="bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-2">Event Tags</p>
                        <div className="flex flex-wrap gap-2">
                            {eventData.eventTags && eventData.eventTags.map((tag, idx) => (
                                <span key={idx} className="bg-stone-800 px-3 py-1 rounded-lg text-white text-sm">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Team Registration */}
                    <div className="bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-1">Team Registration</p>
                        <p className="text-white text-lg font-medium">
                            {eventData.allowTeamRegistration ? 'Enabled' : 'Disabled'}
                        </p>
                    </div>

                    {eventData.allowTeamRegistration && (
                        <>
                            <div className="bg-stone-700 rounded-lg p-4">
                                <p className="text-stone-400 text-sm mb-1">Min Team Size</p>
                                <p className="text-white text-lg font-medium">{eventData.minTeamSize || 2}</p>
                            </div>
                            <div className="bg-stone-700 rounded-lg p-4">
                                <p className="text-stone-400 text-sm mb-1">Max Team Size</p>
                                <p className="text-white text-lg font-medium">{eventData.maxTeamSize || 4}</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Cover Image Information */}
                <div className="mt-4 bg-stone-700 rounded-lg p-4">
                    <p className="text-stone-400 text-sm mb-2">Cover Image</p>
                    {eventData.coverImage ? (
                        <div className="flex gap-4 items-start">
                            <img
                                src={import.meta.env.VITE_BASE_BACKEND_URL + eventData.coverImage}
                                alt="Event Cover"
                                className="rounded-lg object-cover w-40 h-28 sm:w-[200px] sm:h-[150px]"
                            />
                        </div>
                    ) : (
                        <p className="text-stone-400">No cover image uploaded</p>
                    )}
                </div>

                {/* Merchandise Items (if applicable) */}
                {eventData.eventType === 'Merchandise' && eventData.merchandiseItems && (
                    <div className="mt-4 bg-stone-700 rounded-lg p-4">
                        <p className="text-stone-400 text-sm mb-3">Merchandise Items</p>
                        <div className="space-y-4">
                            {eventData.merchandiseItems.map((item, idx) => (
                                <div key={idx} className="bg-stone-800 rounded-lg p-4">
                                    <h3 className="text-white text-lg font-semibold mb-2">
                                        {item.name} - ₹{item.basePrice}
                                    </h3>
                                    <p className="text-stone-300 text-sm mb-3">
                                        Per Participant Limit: {item.perParticipantLimit}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {item.variants && item.variants.map((variant, vIdx) => (
                                            <div key={vIdx} className="bg-stone-700 rounded-lg p-3 flex gap-3">
                                                {variant.coverImage && (
                                                    <img
                                                        src={import.meta.env.VITE_BASE_BACKEND_URL + variant.coverImage}
                                                        alt={`${variant.size} ${variant.color}`}
                                                        className="rounded-lg object-cover"
                                                        style={{ width: "80px", height: "80px" }}
                                                    />
                                                )}
                                                <div className="text-white text-sm">
                                                    <p><span className="text-stone-400">Size:</span> {variant.size}</p>
                                                    <p><span className="text-stone-400">Color:</span> {variant.color}</p>
                                                    <p><span className="text-stone-400">Stock:</span> {variant.stock}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Registration Form Fields */}
                {!isFormLocked && !isEventStarted && !isRegistrationClosed ? (
                    <div className="mt-4">
                        <FormBuilder
                            regForm={regForm}
                            setRegForm={setRegForm}
                            eventName={eventData.eventName}
                            eventDescription={formData.eventDescription}
                            title="Edit Registration Form"
                        />
                    </div>
                ) : (
                    eventData.formFields && eventData.formFields.length > 0 && (
                        <div className="mt-4 bg-stone-700 rounded-lg p-4">
                            <p className="text-stone-300 text-sm mb-3">Registration Form Fields</p>
                            <div className="space-y-2">
                                {eventData.formFields.map((field, idx) => (
                                    <div key={idx} className="bg-stone-800 rounded-lg p-3 flex justify-between items-center">
                                        <div className="text-white">
                                            <span className="font-medium">{field.label}</span>
                                            <span className="text-stone-400 text-sm ml-3">({field.fieldType})</span>
                                            {field.isRequired && <span className="text-orange-400 ml-2">*</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {isFormLocked && (
                                <p className="mt-2 text-yellow-400 text-xs">Registration form is locked &mdash; first registration has been received</p>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Editable Fields */}
            <div className="bg-stone-800 mx-2 sm:mx-5 rounded-xl p-4 sm:p-6">
                <h2 className="text-white text-xl sm:text-2xl mb-4 font-semibold">Editable Fields</h2>

                {isEditingDisabled && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                        Editing is disabled because {eventData.status === 'Closed' ? "the event is closed." : isEventStarted ? "the event has started." : "registration is closed."}.
                    </div>
                )}

                {/* Event Description */}
                <div className="mb-5">
                    <TextArea
                        label="Event Description"
                        name="eventDescription"
                        value={formData.eventDescription}
                        onChange={handleChange}
                        placeholder="Enter Event Description"
                        required
                        rows={6}
                        containerClass=""
                        className="w-full px-4 py-3 text-lg text-white bg-stone-700 placeholder:text-gray-500"
                        iconShow={true}
                        iconSVG='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>'
                        disabled={isEditingDisabled}
                    />
                    {errors.eventDescription && (
                        <p className="mt-1 text-sm text-red-600">{errors.eventDescription}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Registration Deadline */}
                    <div>
                        <Input
                            label="Registration Deadline"
                            type="datetime-local"
                            name="registrationDeadline"
                            value={formData.registrationDeadline}
                            onChange={handleChange}
                            placeholder="Select registration deadline"
                            required
                            containerClass=""
                            className="w-full px-2 py-2.5 text-lg text-white bg-stone-700"
                            iconShow={true}
                            iconSVG='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"></rect><line x1="8" y1="3" x2="8" y2="7"></line><line x1="16" y1="3" x2="16" y2="7"></line><line x1="3" y1="9" x2="21" y2="9"></line><rect x="9" y="12" width="6" height="5" rx="1.5"></rect></svg>'
                            disabled={isEditingDisabled}
                        />
                        {errors.registrationDeadline && (
                            <p className="mt-1 text-sm text-red-600">{errors.registrationDeadline}</p>
                        )}
                        <p className="mt-1 text-xs text-stone-400">You can only extend the deadline</p>
                    </div>

                    {/* Registration Limit */}
                    <div>
                        <Input
                            label="Registration Limit"
                            type="number"
                            name="registrationLimit"
                            value={formData.registrationLimit}
                            onChange={handleChange}
                            placeholder="Enter registration limit"
                            required
                            min={25}
                            max={5000}
                            containerClass=""
                            className="w-full px-2 py-2.5 text-lg text-white bg-stone-700"
                            iconShow={true}
                            iconSVG='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"></circle><path d="M3 18c0-3 3-5 6-5"></path><circle cx="17" cy="9" r="2.5"></circle><path d="M14 18c0-2.5 2.5-4 5-4"></path><line x1="3" y1="21" x2="21" y2="21"></line></svg>'
                            disabled={isEditingDisabled}
                        />
                        {errors.registrationLimit && (
                            <p className="mt-1 text-sm text-red-600">{errors.registrationLimit}</p>
                        )}
                        <p className="mt-1 text-xs text-stone-400">You can only increase the limit</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row px-2 sm:px-5 mt-5 gap-3 sm:justify-end items-stretch sm:items-center">
                {errors.backendError && (
                    <p className="text-sm text-red-600 mr-auto">{errors.backendError}</p>
                )}

                {eventData.status === 'OnGoing' &&
                    <div className="flex gap-2">
                        <Button
                            variant="custom"
                            isbaseStyles={false}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm cursor-pointer"
                            onClick={() => handleCloseEvent()}
                        >
                            Close Event
                        </Button>
                    </div>
                }

                {(eventData.status === 'Published') &&
                    <div className="flex flex-col sm:flex-row gap-3">
                        {!isRegistrationClosed && (
                            <Button
                                isbaseStyles={false}
                                variant="custom"
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 cursor-pointer text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                                onClick={() => handleSubmit(true)}
                                disabled={isEditingDisabled}
                            >
                                Save & Close Registration
                            </Button>
                        )}

                        <Button
                            isbaseStyles={false}
                            variant="primary"
                            className="px-6 py-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            onClick={() => handleSubmit(false)}
                            disabled={isEditingDisabled}
                        >
                            Save Changes
                        </Button>
                    </div>
                }
            </div>
        </div>
    );
}

export default EditEventForm;
