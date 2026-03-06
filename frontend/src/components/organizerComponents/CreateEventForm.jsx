import { useState, useEffect, useContext } from "react";
import { useLocation, useParams } from "react-router-dom";
import Input from "../Input";
import TextArea from "../TextArea";
import Button from "../Button";
import { useRef } from "react";
import FormBuilder from "./FormBuilder";
import { createEvent, createEventDraft, getOrgMaxEvent } from "../../services/events";
import { UserContext } from "../../contexts/UserContexts";
import { useNavigate } from "react-router-dom";

function CreateEventForm() {
    const location = useLocation()
    const params = useParams()
    const { userData } = useContext(UserContext)
    const [isLoadingDraft, setIsLoadingDraft] = useState(false)
    const [isDraft, setIsDraft] = useState(false)
    const navigator = useNavigate()

    const ref = useRef({})
    const [formData, setFormData] = useState({
        eventName: "",
        eventDescription: "",
        eventType: "",
        eligibility: "",
        registrationDeadline: "",
        eventStartDate: "",
        eventEndDate: "",
        registrationLimit: 100,
        registrationFee: 0,
        coverImage: "",
        eventTags: []
    })
    const [errors, setErrors] = useState({})

    const [tagInput, setTagInput] = useState("")

    const [regForm, setRegForm] = useState([])

    // Team registration state
    const [allowTeamRegistration, setAllowTeamRegistration] = useState(false)
    const [minTeamSize, setMinTeamSize] = useState(2)
    const [maxTeamSize, setMaxTeamSize] = useState(4)

    // Merchandise state
    const [merchandiseItems, setMerchandiseItems] = useState([])
    const [currentItem, setCurrentItem] = useState({
        name: "",
        perParticipantLimit: "",
        basePrice: ""
    })
    const [currentVariant, setCurrentVariant] = useState({})

    const resetForm = () => {
        setFormData({
            eventName: "",
            eventDescription: "",
            eventType: "",
            eligibility: "",
            registrationDeadline: "",
            eventStartDate: "",
            eventEndDate: "",
            registrationLimit: 100,
            registrationFee: 0,
            coverImage: "",
            eventTags: []
        })
        setErrors({})
        setTagInput("")
        setRegForm([])
        setAllowTeamRegistration(false)
        setMinTeamSize(2)
        setMaxTeamSize(4)
        setMerchandiseItems([])
        setCurrentItem({
            name: "",
            perParticipantLimit: "",
            basePrice: ""
        })
        setCurrentVariant({})

    }

    // Load draft data when in draft/:id route
    useEffect(() => {
        const isDraftRoute = location.pathname.includes('/create-event/draft/')
        const draftId = params.id

        if (isDraftRoute) setIsDraft(true)

        if (isDraftRoute && draftId && userData?._id) {
            setIsLoadingDraft(true)
            getOrgMaxEvent(draftId)
                .then(response => {
                    const eventData = response.data.response

                    // Verify the event belongs to the current user
                    if (eventData.organizerId !== userData._id) {
                        alert('You do not have permission to edit this draft.')
                        return
                    }

                    // console.log((new Date(eventData.registrationDeadline + 5*60*60*1000)).toISOString().slice(0, 16))
                    // Populate form data
                    setFormData({
                        eventName: eventData.eventName || "",
                        eventDescription: eventData.eventdescription || "",
                        eventType: eventData.eventType || "",
                        eligibility: eventData.eligibility || "",
                        registrationDeadline: eventData.registrationDeadline ? (new Date(new Date(eventData.registrationDeadline).getTime() + 5.5*60*60*1000)).toISOString().slice(0, 16) : "",
                        eventStartDate: eventData.eventStartDate ? (new Date(new Date(eventData.eventStartDate).getTime() + 5.5*60*60*1000)).toISOString().slice(0, 16) : "",
                        eventEndDate: eventData.eventEndDate ? (new Date(new Date(eventData.eventEndDate).getTime() + 5.5*60*60*1000)).toISOString().slice(0, 16) : "",
                        registrationLimit: eventData.registrationLimit || 100,
                        registrationFee: eventData.registrationFee || 0,
                        coverImage: eventData.coverImage || "",
                        eventTags: eventData.eventTags || []
                    })

                    // Populate registration form if exists
                    if (eventData.formFields && Array.isArray(eventData.formFields)) {
                        eventData.formFields.forEach((field, index) => {
                            field.fieldId = index + 1
                        })
                        setRegForm(eventData.formFields)
                    }

                    // Populate team registration fields
                    if (eventData.allowTeamRegistration) {
                        setAllowTeamRegistration(true)
                        setMinTeamSize(eventData.minTeamSize || 2)
                        setMaxTeamSize(eventData.maxTeamSize || 4)
                    }

                    // Populate merchandise items if event type is Merchandise
                    if (eventData.eventType === 'Merchandise' && eventData.merchandiseItems) {
                        setMerchandiseItems(eventData.merchandiseItems)
                    }

                    setIsLoadingDraft(false)
                })
                .catch(error => {
                    console.error('Error loading draft:', error)
                    alert('Failed to load draft: ' + (error.response?.data?.msg || error.message))
                    setIsLoadingDraft(false)
                })
        }
    }, [location.pathname, params.id, userData?._id])

    // Event Form
    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        let newValue = value
        if (name === 'registrationFee') {
            newValue = value === '' ? '' : Math.round(Number(value))
            if (newValue < 0) newValue = -newValue
        }

        if (name === 'registrationLimit') {
            newValue = value === '' ? '' : Math.round(Number(value))
            if (newValue < 0) newValue = -newValue
            if (newValue > 5000) newValue = Math.round(newValue / 10)
        }

        if (name === 'coverImage') {
            newValue = files[0]
        }
        console.log(value)
        setFormData(prev => ({ ...prev, [name]: newValue }))
        setErrors((prev) => ({ ...prev, [name]: '' }))
    }

    const handleTagInput = (e) => setTagInput(e.target.value)

    const addTag = () => {
        const val = tagInput.trim()
        if (formData.eventTags.length + 1 > 25) {
            setErrors(prev => ({ ...prev, eventTags: 'You can only add upto 25 tags.' }))
            return
        }
        if (!val) return
        if (formData.eventTags.includes(val)) {
            setErrors(prev => ({ ...prev, eventTags: 'Tag already added.' }))
            return
        }
        setFormData(prev => ({ ...prev, eventTags: [...prev.eventTags, val] }))
        setTagInput("")
        setErrors(prev => ({ ...prev, eventTags: '' }))
    }

    const removeTag = (index) => {
        setFormData(prev => ({ ...prev, eventTags: prev.eventTags.filter((_, i) => i !== index) }))
        setErrors(prev => ({ ...prev, eventTags: '' }))
    }

    // Merchandise handlers
    const handleCurrentItemChange = (e) => {
        const { name, value } = e.target
        let newValue = value
        if (name === 'perParticipantLimit' || name === 'basePrice') {
            newValue = value === '' ? '' : Math.round(Number(value))
            if (newValue < 0) newValue = -newValue
        }
        setCurrentItem(prev => ({ ...prev, [name]: newValue }))
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: '',
                backendError: ''
            }));
        }
    }

    const handleAddItem = () => {
        if (!currentItem.name.trim()) {
            alert('Please enter item name')
            return
        }
        if (!currentItem.perParticipantLimit || currentItem.perParticipantLimit <= 0) {
            alert('Please enter valid per participant limit')
            return
        }
        if (!currentItem.basePrice || currentItem.basePrice < 0) {
            alert('Please enter valid base price')
            return
        }

        const newItem = {
            ...currentItem,
            variants: []
        }
        setMerchandiseItems(prev => [...prev, newItem])
        setCurrentItem({ name: "", perParticipantLimit: "", basePrice: "" })
        setCurrentVariant(prev => ({ ...prev, [merchandiseItems.length]: { size: "", color: "", stock: "", coverImage: null } }))
        setErrors(prev => ({
            ...prev,
            ['merchandiseItems']: '',
            backendError: ''
        }));
    }

    const handleCurrentVariantChange = (itemIndex, e) => {
        const { name, value, files } = e.target
        let newValue = value

        if (name === 'stock') {
            newValue = value === '' ? '' : Math.round(Number(value))
            if (newValue < 0) newValue = 0
        }

        if (name === 'coverImage') {
            newValue = files[0]
        }

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: '',
                backendError: ''
            }));
        }

        setCurrentVariant(prev => ({
            ...prev,
            [itemIndex]: {
                ...prev[itemIndex],
                [name]: newValue
            }
        }))
    }

    const handleAddVariant = (itemIndex) => {
        const variant = currentVariant[itemIndex]
        if (!variant || !variant.size || !variant.color || !variant.stock) {
            alert('Please fill all variant fields')
            return
        }
        if (!variant.coverImage) {
            alert('Please select a cover image')
            return
        }

        const updatedItems = [...merchandiseItems]
        updatedItems[itemIndex].variants.push({ ...variant })
        setMerchandiseItems(updatedItems)
        ref.current[itemIndex].value = null
        setCurrentVariant(prev => ({
            ...prev,
            [itemIndex]: { size: "", color: "", stock: "", coverImage: null }
        }))
        console.log(errors)

        if (errors[`merchandiseItem_${itemIndex}_variants`]) {
            setErrors(prev => ({
                ...prev,
                [`merchandiseItem_${itemIndex}_variants`]: '',
                backendError: ''
            }));
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        let validationErrors = {}

        // Event Name validation (4-20 characters)
        if (!formData.eventName || formData.eventName.length <= 3 || formData.eventName.length > 20) {
            validationErrors.eventName = "Event Name must be atleast 4 characters and atmost 20 characters long."
        }

        // Event Description validation (50-500 characters)
        if (!formData.eventDescription || formData.eventDescription.length < 50 || formData.eventDescription.length > 500) {
            validationErrors.eventDescription = "Event Description must be atleast 50 characters and atmost 500 characters long."
        }

        // Event Type validation
        const validEventTypes = ["Normal", "Merchandise"]
        if (!formData.eventType || !validEventTypes.includes(formData.eventType)) {
            validationErrors.eventType = "Event Type must be one of: Normal, Merchandise."
        }

        // Eligibility validation (note: frontend shows IIITH but backend expects IIIT)
        const validEligibility = ["IIITH", "Non-IIITH", "Both"]
        if (!formData.eligibility || !validEligibility.includes(formData.eligibility)) {
            validationErrors.eligibility = "Eligibility must be one of: IIITH, Non-IIITH, Both."
        }

        if (!formData.coverImage) {
            validationErrors.coverImage = "Add Cover Image for Event."
        }

        const allowedFileFormats = ['png', 'jpg', 'jpeg']
        // Only validate file format if coverImage is a File object (newly uploaded)
        if (formData.coverImage && typeof formData.coverImage === 'object' && formData.coverImage.name) {
            const fileExtension = formData.coverImage.name.split('.').pop().toLowerCase()
            if (!allowedFileFormats.includes(fileExtension)) {
                validationErrors.coverImage = "Only png, jpg or jpeg formats are allowed."
            }
        }

        // Date validations
        // const nowPlus6 = new Date(Date.now() + 6 * 60 * 60 * 1000)
        const regDeadline = new Date(formData.registrationDeadline)
        const startDate = new Date(formData.eventStartDate)
        const endDate = new Date(formData.eventEndDate)

        if (!formData.registrationDeadline || isNaN(regDeadline)) {
            validationErrors.registrationDeadline = "Registration Deadline must be a valid date."
        }
        if (!formData.eventStartDate || isNaN(startDate)) {
            validationErrors.eventStartDate = "Event Start Date must be a valid date."
        }
        if (!formData.eventEndDate || isNaN(endDate)) {
            validationErrors.eventEndDate = "Event End Date must be a valid date."
        }

        // Registration deadline must be before event start date
        if (regDeadline >= startDate) {
            validationErrors.registrationDeadline = "Registration Deadline must be before Event Start Date."
        }

        // Event start date must be before event end date
        if (startDate >= endDate) {
            validationErrors.eventStartDate = "Event Start Date must be before Event End Date."
        }

        // Event tags validation (3-25 tags)
        if (!Array.isArray(formData.eventTags) || formData.eventTags.length < 3 || formData.eventTags.length > 25) {
            validationErrors.eventTags = "There must be at least 3 and at most 25 event tags."
        }

        // Registration limit validation (25-5000)
        if (typeof formData.registrationLimit !== 'number' || formData.registrationLimit < 25 || formData.registrationLimit > 5000) {
            validationErrors.registrationLimit = "Registration Limit must be between 25 and 5000."
        }

        // Registration fee validation (must be non-negative)
        if (typeof formData.registrationFee !== 'number' || formData.registrationFee < 0) {
            validationErrors.registrationFee = "Registration Fee must be a non-negative number."
        }

        // Merchandise event specific validations
        if (formData.eventType === 'Merchandise') {
            // Check if there are merchandise items
            if (!merchandiseItems || merchandiseItems.length === 0) {
                validationErrors.merchandiseItems = "Merchandise events must have at least one item."
            } else {
                // Validate each merchandise item
                for (let i = 0; i < merchandiseItems.length; i++) {
                    const item = merchandiseItems[i]

                    // Check if item has at least one variant
                    if (!item.variants || item.variants.length === 0) {
                        validationErrors[`merchandiseItem_${i}_variants`] = `Item ${i + 1} (${item.name}): Must have at least one variant.`
                    }
                }
            }
        }

        // If there are errors, set them and return
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            console.log("Validation Errors:", validationErrors)
            return
        }

        // Prepare final data to send
        const eventDataObj = {
            // Map frontend field names to backend field names
            eventName: formData.eventName,
            eventdescription: formData.eventDescription, // Note: backend uses lowercase 'd'
            eventType: formData.eventType,
            eligibility: formData.eligibility, // Convert IIITH to IIIT for backend
            registrationDeadline: formData.registrationDeadline,
            eventStartDate: formData.eventStartDate,
            eventEndDate: formData.eventEndDate,
            registrationLimit: formData.registrationLimit,
            registrationFee: formData.registrationFee,
            eventTags: formData.eventTags,
            formFields: regForm, // Registration form fields
            wasDraft: isDraft,
            coverImage: formData.coverImage,
            id: isDraft ? params.id : undefined,
            allowTeamRegistration: formData.eventType === 'Normal' ? allowTeamRegistration : false,
            minTeamSize: allowTeamRegistration && formData.eventType === 'Normal' ? minTeamSize : 2,
            maxTeamSize: allowTeamRegistration && formData.eventType === 'Normal' ? maxTeamSize : 4,
        }

        // Add merchandise items if it's a merchandise event (without file objects)
        if (formData.eventType === 'Merchandise') {
            eventDataObj.merchandiseItems = merchandiseItems.map((item, index) => ({
                itemId: `item_${Date.now()}_${index}`, // Generate unique itemId
                name: item.name,
                basePrice: item.basePrice,
                perParticipantLimit: item.perParticipantLimit,
                variants: item.variants.map((variant, vIndex) => ({
                    variantId: `variant_${Date.now()}_${index}_${vIndex}`, // Generate unique variantId
                    size: variant.size,
                    color: variant.color,
                    stock: variant.stock,
                    coverImage: variant.coverImage
                }))
            }))
        }

        // Create FormData and add event data as JSON string
        const formDataToSend = new FormData()
        formDataToSend.append('eventData', JSON.stringify(eventDataObj))

        // Add cover image for the event (only if it's a new File upload)
        if (formData.coverImage && typeof formData.coverImage === 'object') {
            formDataToSend.append('coverImage', formData.coverImage)
        }

        // Add merchandise variant images if it's a merchandise event
        if (formData.eventType === 'Merchandise') {
            merchandiseItems.forEach((item, itemIndex) => {
                item.variants.forEach((variant, variantIndex) => {
                    if (variant.coverImage) {
                        formDataToSend.append(
                            `merchandiseItems[${itemIndex}][variants][${variantIndex}][coverImage]`,
                            variant.coverImage
                        )
                    }
                })
            })
        }

        // Call unified createEvent API
        try {
            const response = await createEvent(formDataToSend)
            console.log('Event created successfully:', response.data)
            alert('Event created successfully!')
            resetForm()
            navigator('/organizer-dashboard')
        } catch (err) {
            console.error('Error creating event:', err)
            setErrors(prev => ({ ...prev, backendError: err.response?.data?.error || 'Failed to create event' }))
        }
    }

    const handleSaveAsDraft = async (e) => {
        e.preventDefault()

        // Prepare basic event data without validation
        const eventDataObj = {
            eventName: formData.eventName || '',
            eventdescription: formData.eventDescription || '',
            eventType: formData.eventType || 'Normal',
            eligibility: formData.eligibility || '',
            registrationDeadline: formData.registrationDeadline || new Date(),
            eventStartDate: formData.eventStartDate || new Date(),
            eventEndDate: formData.eventEndDate || new Date(),
            registrationLimit: formData.registrationLimit || 100,
            registrationFee: formData.registrationFee || 0,
            eventTags: formData.eventTags || [],
            formFields: regForm || [],
            isDraft: true, // Mark as draft
            wasDraft: params.id ? true : false,
            id: params.id || undefined,
            allowTeamRegistration: formData.eventType === 'Normal' ? allowTeamRegistration : false,
            minTeamSize: allowTeamRegistration ? minTeamSize : 2,
            maxTeamSize: allowTeamRegistration ? maxTeamSize : 4,
        }

        // Add merchandise items if it's a merchandise event
        if (formData.eventType === 'Merchandise' && merchandiseItems.length > 0) {
            eventDataObj.merchandiseItems = merchandiseItems.map((item, index) => ({
                itemId: `item_${Date.now()}_${index}`,
                name: item.name || '',
                basePrice: item.basePrice || 0,
                perParticipantLimit: item.perParticipantLimit || 1,
                variants: (item.variants || []).map((variant, vIndex) => ({
                    variantId: `variant_${Date.now()}_${index}_${vIndex}`,
                    size: variant.size || '',
                    color: variant.color || '',
                    stock: variant.stock || 0,
                    coverImage: variant.coverImage
                }))
            }))
        }

        // Create FormData
        const formDataToSend = new FormData()
        formDataToSend.append('eventData', JSON.stringify(eventDataObj))

        // Add cover image if provided (only if it's a new File upload)
        if (formData.coverImage && typeof formData.coverImage === 'object') {
            formDataToSend.append('coverImage', formData.coverImage)
        }

        // Add merchandise variant images if available
        if (formData.eventType === 'Merchandise' && merchandiseItems.length > 0) {
            merchandiseItems.forEach((item, itemIndex) => {
                if (item.variants) {
                    item.variants.forEach((variant, variantIndex) => {
                        if (variant.coverImage) {
                            formDataToSend.append(
                                `merchandiseItems[${itemIndex}][variants][${variantIndex}][coverImage]`,
                                variant.coverImage
                            )
                        }
                    })
                }
            })
        }

        // Call unified createEvent API with draft flag
        try {
            const response = await createEventDraft(formDataToSend)
            console.log('Draft saved successfully:', response.data)
            alert('Draft saved successfully!')
            resetForm()
            navigator('/organizer-dashboard')
        } catch (err) {
            console.error('Error saving draft:', err)
            setErrors(prev => ({ ...prev, backendError: err.response?.data?.error || 'Failed to save draft' }))
        }
    }

    if (isLoadingDraft) {
        return (
            <div className="w-full px-4 lg:px-8 flex justify-center items-center min-h-screen">
                <div className="text-white text-xl">Loading draft...</div>
            </div>
        )
    }

    return (
        <div className="w-full px-4 lg:px-8">
            <h1 className="text-white text-3xl px-1 sm:px-5 py-4 font-semibold">Create Event</h1>

            <div className="flex flex-col lg:flex-row">
                <div className="bg-stone-800 sm:ml-5 rounded-xl w-full">

                    {/* Event Name */}
                    <Input
                        label="Event Name"
                        type="text"
                        name="eventName"
                        value={formData.eventName}
                        onChange={handleChange}
                        placeholder="Enter Event Name"
                        required
                        error={errors.eventName}
                        containerClass='m-5 mt-0 pt-5'
                        className='placeholder:text-gray-500 text-lg text-white '
                        iconShow={true}
                        iconSVG='
                        <svg xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1"
                            stroke-linecap="round"
                            stroke-linejoin="round">

                        <!-- Calendar body -->
                        <rect x="3" y="4" width="18" height="17" rx="2" ry="2"></rect>

                        <!-- Calendar rings -->
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>

                        <!-- Title lines (event name) -->
                        <line x1="7" y1="11" x2="17" y2="11"></line>
                        <line x1="7" y1="15" x2="13" y2="15"></line>

                        </svg>
                    '
                    />

                    {/* Event Description */}
                    <TextArea
                        containerClass="m-5"
                        onChange={handleChange}
                        className="w-full pt-2 pl-4 ring-1 focus:ring-orange-400 focus:ring-2
                         placeholder:text-gray-500 h-34 caret-white text-white text-lg"
                        placeholder="Type Event Description"
                        label="Event Description"
                        name="eventDescription"
                        value={formData.eventDescription}
                        iconShow={true}
                        iconSVG='
                            <svg xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1"
                                stroke-linecap="round"
                                stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="8" y1="13" x2="16" y2="13"/>
                            <line x1="8" y1="17" x2="16" y2="17"/>
                            <line x1="8" y1="9" x2="10" y2="9"/>
                            </svg>'
                        required
                    >

                    </TextArea>
                    {errors.eventDescription && (
                        <p className="mx-5 -mt-3 mb-3 text-sm text-red-600">{errors.eventDescription}</p>
                    )}

                    {/* Event Type */}
                    <div className="m-5 pb-1">
                        <label className="flex items-center gap-2 text-md font-medium text-white mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinecap="round"
                                strokeLinejoin="round">
                                <path d="M20 10l-8-8H4v8l8 8 8-8z"></path>
                                <circle cx="7.5" cy="7.5" r="1.5"></circle>

                            </svg>
                            <span>
                                Event Type <span className="text-orange-500">*</span>
                            </span>
                        </label>
                        <div className='relative'>
                            <select
                                name="eventType"
                                value={formData.eventType}
                                onChange={handleChange}
                                required
                                className={`w-full px-2 appearance-none py-2.5 border border-gray-300 
                                        rounded-lg focus:ring-2 focus:ring-orange-400 
                                        focus:border-transparent outline-none transition-all 
                                        duration-200 placeholder:text-gray-500 text-lg text-white
                                        bg-stone-800 ${errors.eventType ? 'border-red-500 focus:ring-red-500' : ''
                                    }`}
                            >
                                <option value="" className="text-gray-500">Select Event type</option>
                                <option value="Normal">Normal</option>
                                <option value="Merchandise">Merchandise</option>
                            </select>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="pointer-events-none w-4 h-4 text-white absolute right-2 -translate-y-14/7"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>

                        </div>
                        {errors.eventType && (
                            <p className="mt-1 text-sm text-red-600">{errors.eventType}</p>
                        )}
                    </div>

                </div>

                <div className="bg-stone-800 sm:ml-5 mt-5 lg:mt-0 rounded-xl w-full sm:mr-5">
                    <div className="m-5">
                        <label className="flex items-center gap-2 text-md font-medium text-white mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinecap="round"
                                strokeLinejoin="round">
                                <path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z"></path>
                                <polyline points="9 12 11 14 15 10"></polyline>
                            </svg>
                            <span>
                                Eligibility <span className="text-orange-500">*</span>
                            </span>
                        </label>
                        <div className='relative'>
                            <select
                                name="eligibility"
                                value={formData.eligibility}
                                onChange={handleChange}
                                required
                                className={`w-full px-2 appearance-none py-2.5 border border-gray-300 
                                        rounded-lg focus:ring-2 focus:ring-orange-400 
                                        focus:border-transparent outline-none transition-all 
                                        duration-200 placeholder:text-gray-500 text-lg text-white
                                        bg-stone-800 ${errors.eligibility ? 'border-red-500 focus:ring-red-500' : ''
                                    }`}
                            >
                                <option value="" className="text-gray-500">Select Eligibility Criterion</option>
                                <option value="IIITH">IIITH</option>
                                <option value="Non-IIITH">Non-IIITH</option>
                                <option value="Both">Both</option>
                            </select>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="pointer-events-none w-4 h-4 text-white absolute right-2 -translate-y-14/7"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>

                        </div>
                        {errors.eventType && (
                            <p className="mt-1 text-sm text-red-600">{errors.eventType}</p>
                        )}
                    </div>

                    <div className="m-5">
                        <Input
                            label="Registration Deadline"
                            type="datetime-local"
                            name="registrationDeadline"
                            value={formData.registrationDeadline}
                            onChange={handleChange}
                            placeholder="Select registration deadline"
                            required
                            containerClass="mb-4"
                            className="w-full px-2 py-2.5 text-lg text-white bg-stone-800"
                            iconShow={true}
                            iconSVG='
                                <svg xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round">

                                <!-- Calendar frame -->
                                <rect x="3" y="5" width="18" height="16" rx="3"></rect>

                                <!-- Binding rings -->
                                <line x1="8" y1="3" x2="8" y2="7"></line>
                                <line x1="16" y1="3" x2="16" y2="7"></line>

                                <!-- Header separator -->
                                <line x1="3" y1="9" x2="21" y2="9"></line>

                                <!-- Highlighted date square -->
                                <rect x="9" y="12" width="6" height="5" rx="1.5"></rect>

                                </svg>
                            '
                        />
                        {errors.registrationDeadline && (
                            <p className="mt-1 text-sm text-red-600">{errors.registrationDeadline}</p>
                        )}

                        <Input
                            label="Event Start Date"
                            type="datetime-local"
                            name="eventStartDate"
                            value={formData.eventStartDate}
                            onChange={handleChange}
                            placeholder="Select event start date"
                            required
                            containerClass="mb-4"
                            className="w-full px-2 py-2.5 text-lg text-white bg-stone-800"
                            iconShow={true}
                            iconSVG='
                                <svg xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round">

                                <!-- Calendar frame -->
                                <rect x="3" y="5" width="18" height="16" rx="3"></rect>

                                <!-- Binding rings -->
                                <line x1="8" y1="3" x2="8" y2="7"></line>
                                <line x1="16" y1="3" x2="16" y2="7"></line>

                                <!-- Header separator -->
                                <line x1="3" y1="9" x2="21" y2="9"></line>

                                <!-- Highlighted date square -->
                                <rect x="9" y="12" width="6" height="5" rx="1.5"></rect>

                                </svg>
                            '
                        />
                        {errors.eventStartDate && (
                            <p className="mt-1 text-sm text-red-600">{errors.eventStartDate}</p>
                        )}

                        <Input
                            label="Event End Date"
                            type="datetime-local"
                            name="eventEndDate"
                            value={formData.eventEndDate}
                            onChange={handleChange}
                            placeholder="Select event end date"
                            required
                            containerClass="mb-4"
                            className="w-full px-2 py-2.5 text-lg text-white bg-stone-800"
                            iconShow={true}
                            iconSVG='
                                <svg xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round">

                                <!-- Calendar frame -->
                                <rect x="3" y="5" width="18" height="16" rx="3"></rect>

                                <!-- Binding rings -->
                                <line x1="8" y1="3" x2="8" y2="7"></line>
                                <line x1="16" y1="3" x2="16" y2="7"></line>

                                <!-- Header separator -->
                                <line x1="3" y1="9" x2="21" y2="9"></line>

                                <!-- Highlighted date square -->
                                <rect x="9" y="12" width="6" height="5" rx="1.5"></rect>

                                </svg>
                            '
                        />
                        {errors.eventEndDate && (
                            <p className="mt-1 text-sm text-red-600">{errors.eventEndDate}</p>
                        )}
                    </div>

                </div>

            </div>

            <div className="flex flex-col lg:flex-row mt-7 gap-5">
                <div className="bg-stone-800 sm:ml-5 rounded-xl w-full py-1">
                    <div className="m-5">
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
                            containerClass="mb-4"
                            className="w-full px-2 py-2.5 text-lg text-white bg-stone-800"
                            iconShow={true}
                            iconSVG='
                                <svg xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round">

                                <!-- Main user -->
                                <circle cx="9" cy="8" r="3"></circle>
                                <path d="M3 18c0-3 3-5 6-5"></path>

                                <!-- Secondary user -->
                                <circle cx="17" cy="9" r="2.5"></circle>
                                <path d="M14 18c0-2.5 2.5-4 5-4"></path>

                                <!-- Limit indicator line -->
                                <line x1="3" y1="21" x2="21" y2="21"></line>

                                </svg>'
                        />
                        {errors.registrationLimit && (
                            <p className="mt-1 text-sm text-red-600">{errors.registrationLimit}</p>
                        )}

                        <Input
                            label="Registration Fee"
                            type="number"
                            name="registrationFee"
                            value={formData.registrationFee}
                            onChange={handleChange}
                            placeholder="Enter registration fee"
                            required
                            min={0}
                            containerClass="mb-4"
                            className="w-full px-2 py-2.5 text-lg text-white bg-stone-800"
                            iconShow={true}
                            iconSVG='
                                <svg fill="#FFFFFF" viewBox="0 0 24 24" 
                                xmlns="http://www.w3.org/2000/svg">
                                <g id="SVGRepo_bgCarrier" stroke-width="0">
                                </g><g id="SVGRepo_tracerCarrier" 
                                stroke-linecap="round" stroke-linejoin="round">
                                </g><g id="SVGRepo_iconCarrier"> 
                                <path d="M12.9494914,6 C13.4853936,6.52514205 
                                13.8531598,7.2212202 13.9645556,8 
                                L17.5,8 C17.7761424,8 18,8.22385763 
                                18,8.5 C18,8.77614237 17.7761424,9 17.5,9 
                                L13.9645556,9 C13.7219407,10.6961471 12.263236,12 
                                10.5,12 L7.70710678,12 L13.8535534,18.1464466 
                                C14.0488155,18.3417088 14.0488155,18.6582912 
                                13.8535534,18.8535534 C13.6582912,19.0488155 
                                13.3417088,19.0488155 13.1464466,18.8535534 L6.14644661,11.8535534
                                 C5.83146418,11.538571 6.05454757,11 6.5,11 
                                 L10.5,11 C11.709479,11 12.7183558,10.1411202 
                                 12.9499909,9 L6.5,9 C6.22385763,9 6,8.77614237 
                                 6,8.5 C6,8.22385763 6.22385763,8 6.5,8 
                                 L12.9499909,8 C12.7183558,6.85887984 11.709479,6 
                                 10.5,6 L6.5,6 C6.22385763,6 6,5.77614237 6,5.5 
                                 C6,5.22385763 6.22385763,5 6.5,5 
                                L10.5,5 L17.5,5 C17.7761424,5 18,5.22385763 
                                18,5.5 C18,5.77614237 17.7761424,6 17.5,6 L12.9494914,6 L12.9494914,6 Z">
                                </path> </g></svg>
                            '
                        />
                        {errors.registrationFee && (
                            <p className="mt-1 text-sm text-red-600">{errors.registrationFee}</p>
                        )}

                        {/* Team Registration Option (Normal events only) */}
                        {formData.eventType === 'Normal' && (
                            <div className="mt-5 border border-stone-600 rounded-lg p-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allowTeamRegistration}
                                        onChange={(e) => setAllowTeamRegistration(e.target.checked)}
                                        className="w-5 h-5 rounded accent-orange-400 bg-stone-700 border-stone-500"
                                    />
                                    <span className="text-white font-medium text-lg">Allow Team Registration</span>
                                </label>
                                <p className="text-stone-400 text-sm mt-1 ml-8">Enable hackathon-style team formation with invitations</p>

                                {allowTeamRegistration && (
                                    <div className="mt-4 ml-8 flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1">
                                            <label className="text-stone-300 text-sm font-medium mb-1 block">Min Team Size</label>
                                            <input
                                                type="number"
                                                min={2}
                                                max={maxTeamSize}
                                                value={minTeamSize}
                                                onChange={(e) => {
                                                    const v = Math.max(2, parseInt(e.target.value) || 2)
                                                    setMinTeamSize(v)
                                                    if (v > maxTeamSize) setMaxTeamSize(v)
                                                }}
                                                className="w-full px-3 py-2 text-white bg-stone-700 ring-1 ring-stone-500 rounded-md focus:ring-orange-400 outline-none focus:ring-2"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-stone-300 text-sm font-medium mb-1 block">Max Team Size</label>
                                            <input
                                                type="number"
                                                min={minTeamSize}
                                                max={20}
                                                value={maxTeamSize}
                                                onChange={(e) => {
                                                    const v = Math.min(20, Math.max(minTeamSize, parseInt(e.target.value) || minTeamSize))
                                                    setMaxTeamSize(v)
                                                }}
                                                className="w-full px-3 py-2 text-white bg-stone-700 ring-1 ring-stone-500 rounded-md focus:ring-orange-400 outline-none focus:ring-2"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-stone-800 rounded-xl w-full">
                    <div className="m-5">
                        <label className="text-white font-medium mb-2 block">Event Tags</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="tagInput"
                                value={tagInput}
                                onChange={handleTagInput}
                                placeholder="Enter tag and press Add"
                                className="w-full px-2 py-2.5 text-lg text-white bg-stone-800 ring-1 ring-stone-300 rounded-md focus:ring-orange-400 outline-none focus:ring-2"
                                onKeyDown={(e) => { if (e.key === 'Enter') addTag() }}
                            />
                            <Button
                                variant="custom" className="text-nowrap px-3 bg-stone-700
                                 rounded-lg hover:bg-orange-400 text-white transition-all
                                  active:bg-stone-700" isbaseStyles={false}
                                onClick={addTag}
                            >
                                Add Tag
                            </Button>
                        </div>
                        {errors.eventTags && (
                            <p className="mt-1 text-sm text-red-600">{errors.eventTags}</p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                            {formData.eventTags.map((tag, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-stone-700 px-3 py-1 rounded-lg hover:bg-stone-600">
                                    <span className="text-white">{tag}</span>
                                    <button type="button" onClick={() => removeTag(idx)} className="text-red-400">x</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="bg-stone-800 rounded-xl sm:mr-5 w-full">

                    <h1 className="px-2 pt-2 text-white">Add Cover Image<span className="text-orange-500">*</span></h1>

                    <input
                        type="file"
                        name="coverImage"
                        accept=".png,image/png"
                        onChange={(e) => handleChange(e)}
                        className="px-2 py-1 rounded-lg 
                        focus:ring-2 focus:ring-orange-400 
                        focus:border-transparent outline-none 
                        transition-all duration-200 
                        text-white bg-stone-800 file:mr-4 
                        file:py-2 file:px-4 file:rounded-lg
                            file:border-0 file:text-sm 
                            file:font-semibold file:bg-stone-700 
                            file:text-white hover:file:bg-orange-400"
                        multiple
                    />
                    <div className="w-full flex justify-center items-center">
                        {formData.coverImage &&
                            <img
                                src={
                                    (isDraft && formData.coverImage && typeof formData.coverImage === 'string') ?
                                        (import.meta.env.VITE_BASE_BACKEND_URL + formData.coverImage) : URL.createObjectURL(formData.coverImage)
                                }
                                alt="Preview"
                                // style={{ width: "100px", height: "100px", margin: "12px" }}
                                className="rounded-lg mt-3 w-full h-full"

                            />
                        }
                    </div>
                    {errors.coverImage && (
                        <p className="mx-5 mb-3 text-sm text-red-600">{errors.coverImage}</p>
                    )}
                </div>
            </div>



            {formData.eventType === 'Merchandise' &&
                <div> {/* This is outer-div */}
                    <h1 className="text-white text-3xl px-5 pt-4 mt-3 font-semibold">Merchandise Event</h1>
                    <div className="flex flex-col mt-3 mb-5">
                        <div className="bg-stone-800 sm:ml-5 rounded-xl w-full py-1 sm:mr-5"> {/* inner-div */}
                            {/*Item Adder */}
                            <div className="mb-2 mr-5 ml-5 mt-5 gap-3 flex flex-col sm:flex-row justify-center items-stretch sm:items-center">
                                <Input
                                    label="Item Name"
                                    type="text"
                                    name="name"
                                    value={currentItem.name}
                                    onChange={handleCurrentItemChange}
                                    placeholder="Enter Item Name"
                                    required
                                    containerClass="w-full mb-1"
                                    className="px-2 text-lg text-white bg-stone-800"
                                    iconShow={true}
                                    iconSVG='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10l-8-8H4v8l8 8 8-8z"></path><circle cx="7.5" cy="7.5" r="1.5"></circle></svg>'
                                />

                                <Input
                                    label="Per Participant Limit"
                                    type="number"
                                    name="perParticipantLimit"
                                    value={currentItem.perParticipantLimit}
                                    onChange={handleCurrentItemChange}
                                    placeholder="Enter Per Participant Limit"
                                    required
                                    min={1}
                                    containerClass="w-full mb-1"
                                    className="px-2 text-lg text-white bg-stone-800"
                                    iconShow={true}
                                    iconSVG='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"></circle><path d="M3 18c0-3 3-5 6-5"></path><circle cx="17" cy="9" r="2.5"></circle><path d="M14 18c0-2.5 2.5-4 5-4"></path><line x1="3" y1="21" x2="21" y2="21"></line></svg>'
                                />

                                <Input
                                    label="Base Price"
                                    type="number"
                                    name="basePrice"
                                    value={currentItem.basePrice}
                                    onChange={handleCurrentItemChange}
                                    placeholder="Enter Base Price"
                                    required
                                    min={0}
                                    containerClass="w-full mb-1"
                                    className="w-full px-2 text-lg text-white bg-stone-800"
                                    iconShow={true}
                                    iconSVG='<svg fill="#FFFFFF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M12.9494914,6 C13.4853936,6.52514205 13.8531598,7.2212202 13.9645556,8 L17.5,8 C17.7761424,8 18,8.22385763 18,8.5 C18,8.77614237 17.7761424,9 17.5,9 L13.9645556,9 C13.7219407,10.6961471 12.263236,12 10.5,12 L7.70710678,12 L13.8535534,18.1464466 C14.0488155,18.3417088 14.0488155,18.6582912 13.8535534,18.8535534 C13.6582912,19.0488155 13.3417088,19.0488155 13.1464466,18.8535534 L6.14644661,11.8535534 C5.83146418,11.538571 6.05454757,11 6.5,11 L10.5,11 C11.709479,11 12.7183558,10.1411202 12.9499909,9 L6.5,9 C6.22385763,9 6,8.77614237 6,8.5 C6,8.22385763 6.22385763,8 6.5,8 L12.9499909,8 C12.7183558,6.85887984 11.709479,6 10.5,6 L6.5,6 C6.22385763,6 6,5.77614237 6,5.5 C6,5.22385763 6.22385763,5 6.5,5 L10.5,5 L17.5,5 C17.7761424,5 18,5.22385763 18,5.5 C18,5.77614237 17.7761424,6 17.5,6 L12.9494914,6 L12.9494914,6 Z"></path> </g></svg>'
                                />

                                <Button
                                    variant="custom"
                                    className="px-6 h-13 text-nowrap bg-stone-700 rounded-lg hover:bg-orange-400 text-white transition-all active:bg-stone-700 text-lg mt-4"
                                    isbaseStyles={false}
                                    onClick={handleAddItem}
                                >
                                    Add Item
                                </Button>
                            </div>
                            {/* Display merchandise items error */}
                            {errors.merchandiseItems && (
                                <p className="mx-5 mb-3 text-sm text-red-600">{errors.merchandiseItems}</p>
                            )}
                        </div>
                    </div>

                    {/* Item Showcase */}
                    {merchandiseItems.map((item, itemIndex) => (
                        <div key={itemIndex}>
                            <h1 className="text-white text-3xl px-5 pt-4 mt-3 font-semibold">{item.name}  (Price: {item.basePrice})</h1>
                            {/* Display item-specific errors */}
                            {errors[`merchandiseItem_${itemIndex}_variants`] && (
                                <p className="mx-5 mt-2 text-sm text-red-600">{errors[`merchandiseItem_${itemIndex}_variants`]}</p>
                            )}
                            <div className="flex flex-col mt-3 mb-5">
                                <div className="bg-stone-800 sm:ml-5 rounded-xl w-full py-1 sm:mr-5">
                                    {/* Variant Input */}
                                    <div className="m-5">
                                        <div className="grid grid-cols-2 gap-4 mb-1">
                                            <Input
                                                label="Size"
                                                type="text"
                                                name="size"
                                                value={currentVariant[itemIndex]?.size || ""}
                                                onChange={(e) => handleCurrentVariantChange(itemIndex, e)}
                                                placeholder="Enter Size"
                                                containerClass=""
                                                className="w-full px-2 py-2.5 text-lg text-white bg-stone-800"
                                                iconShow={true}
                                                iconSVG='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>'
                                            />

                                            <Input
                                                label="Color"
                                                type="text"
                                                name="color"
                                                value={currentVariant[itemIndex]?.color || ""}
                                                onChange={(e) => handleCurrentVariantChange(itemIndex, e)}
                                                placeholder="Enter Color"
                                                containerClass=""
                                                className="w-full px-2 py-2.5 text-lg text-white bg-stone-800"
                                                iconShow={true}
                                                iconSVG='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>'
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <Input
                                                label="Stock"
                                                type="number"
                                                name="stock"
                                                value={currentVariant[itemIndex]?.stock || ""}
                                                onChange={(e) => handleCurrentVariantChange(itemIndex, e)}
                                                placeholder="Enter Stock"
                                                min={0}
                                                containerClass=""
                                                className="w-full px-2 py-2.5 text-lg text-white bg-stone-800"
                                                iconShow={true}
                                                iconSVG='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>'
                                            />

                                            <div>
                                                <label className="flex items-center gap-2 text-md font-medium text-white mb-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                        <polyline points="21 15 16 10 5 21"></polyline>
                                                    </svg>
                                                    <span>Cover Image (PNG) <span className="text-orange-500">*</span></span>
                                                </label>
                                                <input
                                                    type="file"
                                                    name="coverImage"
                                                    ref={(el) => (ref.current[itemIndex] = el)}
                                                    accept=".png,image/png"
                                                    onChange={(e) => handleCurrentVariantChange(itemIndex, e)}
                                                    className="w-full px-2 py-2.5 border border-gray-300 rounded-lg 
                                                    focus:ring-2 focus:ring-orange-400 
                                                    focus:border-transparent outline-none 
                                                    transition-all duration-200 
                                                    text-white bg-stone-800 file:mr-4 
                                                    file:py-2 file:px-4 file:rounded-lg
                                                     file:border-0 file:text-sm 
                                                     file:font-semibold file:bg-stone-700 
                                                     file:text-white hover:file:bg-orange-400"
                                                    multiple
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            variant="custom"
                                            className="w-full px-3 py-2.5 bg-stone-700 rounded-lg hover:bg-orange-400 text-white transition-all active:bg-stone-700 text-lg"
                                            isbaseStyles={false}
                                            onClick={() => handleAddVariant(itemIndex)}
                                        >
                                            Add Variant
                                        </Button>
                                    </div>

                                    {/* Variant Showcase. */}
                                    {item.variants.length > 0 && (
                                        <div className="m-5 mt-0">
                                            <h2 className="text-white text-xl font-medium mb-3">Variants:</h2>
                                            <div className="space-y-3">
                                                <div className="bg-stone-800 rounded-lg flex gap-4 justify-start flex-wrap">
                                                    {item.variants.map((variant, variantIndex) => (
                                                        <div className="bg-stone-700 w-fit rounded-lg mb-3" key={variantIndex}>

                                                            <div className="rounded-lg overflow-hidden">
                                                                {variant.coverImage && (
                                                                    <img
                                                                        src={
                                                                            (isDraft && variant.coverImage && typeof variant.coverImage === 'string') ?
                                                                                (import.meta.env.VITE_BASE_BACKEND_URL + variant.coverImage) : URL.createObjectURL(variant.coverImage)
                                                                        }
                                                                        alt="Preview"
                                                                        style={{ width: "260px", height: "300px", margin: "12px" }}
                                                                        className="rounded-lg"

                                                                    />
                                                                )}
                                                                <div className="font-medium text-white ml-3 text-lg">Size: {variant.size}</div>
                                                                <div className="font-medium text-white ml-3 text-lg">Color: {variant.color}</div>
                                                                <div className="font-medium text-white ml-3 text-lg mb-1">stock: {variant.stock}</div>
                                                            </div>

                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            }

            <FormBuilder eventName={formData.eventName} eventDescription={formData.eventDescription} regForm={regForm} setRegForm={setRegForm} />
            <div className="flex flex-row px-4 sm:px-5 mb-5 items-center gap-3">
                <Button
                    isbaseStyles={false}
                    variant="custom"
                    className="px-4 py-2 bg-stone-800 rounded-lg text-lg text-white hover:bg-stone-700"
                    type="button"
                    onClick={handleSaveAsDraft}
                >
                    Save As Draft
                </Button>

                <Button
                    isbaseStyles={false}
                    variant="primary"
                    className="px-2 py-2"
                    type="submit"
                    onClick={handleSubmit}
                >
                    Publish Event
                </Button>
                {errors.backendError && (
                    <p className="mt-1 text-sm text-red-600 mr-3">{errors.backendError}</p>
                )}
            </div>
        </div>
    )
}

export default CreateEventForm;