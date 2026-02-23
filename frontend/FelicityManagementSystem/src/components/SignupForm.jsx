import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from './Input';
import PasswordInputBox from './PasswordInputBox';
import Button from './Button';
import CheckBox from './CheckBox';
import { signupUser } from '../services/auth'
import { submitOnboarding, getTopOrganizers } from '../services/participant'
import { UserContext } from '../contexts/UserContexts'
import logo from '../assets/Felicity_Logo_Light.png'

const INTEREST_OPTIONS = [
    'Technology', 'Music', 'Dance', 'Art', 'Drama',
    'Sports', 'Photography', 'Literature', 'Gaming',
    'Robotics', 'Coding', 'Design', 'Entrepreneurship',
    'Social Work', 'Science', 'Quiz', 'Debate', 'Film',
]

const SignupForm = ({ onSubmit }) => {
    const navigate = useNavigate()
    const { updateUserData } = useContext(UserContext)

    const [stage, setStage] = useState(0)

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        participantType: '',
        orgName: '',
        contactNumber: '',
        agreeToTerms: false
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: '',
                backendError: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        const allowedDomains = [
            "student.iiit.ac.in",
            "research.iiit.ac.in",
            "alumni.iiit.ac.in",
            "cie.iiit.ac.in",
            "dfl.iiit.ac.in",
            "iiit.ac.in"
        ];

        const domain = formData.email.split('@')[1]
        if (formData.participantType === 'IIITH') {
            if (!allowedDomains.includes(domain)) {
                newErrors.email = 'IIITH Participants must use their IIITH email.';
            }
        }

        if (allowedDomains.includes(domain) && formData.participantType === 'Non-IIITH') {
            newErrors.participantType = 'Please select IIITH if you are signing using IIITH email.'
        }


        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        // Confirm password
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        // First name
        if (!formData.firstName) {
            newErrors.firstName = 'First name is required';
        }

        // Last name
        if (!formData.lastName) {
            newErrors.lastName = 'Last name is required';
        }

        // Participant type
        if (!formData.participantType) {
            newErrors.participantType = 'Please select participant type';
        }

        // Contact number
        if (!formData.contactNumber) {
            newErrors.contactNumber = 'Contact number is required';
        } else if (!/^\d{10}$/.test(formData.contactNumber)) {
            newErrors.contactNumber = 'Contact number must be 10 digits';
        }

        // Terms agreement
        if (!formData.agreeToTerms) {
            newErrors.agreeToTerms = 'You must agree to the terms and conditions';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (validateForm()) {
            const { confirmPassword, agreeToTerms, ...submitData } = formData;
            if (submitData.participantType === 'IIITH') submitData.orgName = "IIITH"
            submitData.role = "Participant"
            await signupUser(submitData)
                .then((r) => {
                    if (r.data.response) {
                        updateUserData(r.data.response)
                    }
                    setStage(1)
                }).catch((err) => {
                    setErrors((prev) => {
                        return { ...prev, backendError: err.response.data.error }
                    })
                })

        }
    };

    return (
        <div className='flex justify-center items-center w-full h-full px-4'>
            {stage === 0 &&
                <form onSubmit={handleSubmit} className="w-full max-w-md lg:max-w-xl bg-stone-800 drop-shadow-stone-950 drop-shadow-xl justify-center items-center rounded-2xl">
                    <div className='flex justify-center items-center'>
                        <img
                            src={logo}
                            className="w-60 h-25 mt-8"
                        />
                    </div>
                    <div className="mb-6">
                        <p className="text-white text-3xl mt-5 ml-8">Sign Up</p>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-8">
                        <Input
                            label="First Name"
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="Enter your first name"
                            required
                            error={errors.firstName}
                            containerClass=''
                            className='placeholder:text-gray-500 text-lg text-white'
                            iconShow={true}
                            iconSVG='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>'
                        />
                        <Input
                            label="Last Name"
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="Enter your last name"
                            required
                            error={errors.lastName}
                            containerClass=''
                            className='placeholder:text-gray-500 text-lg text-white'
                            iconShow={true}
                            iconSVG='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>'
                        />
                    </div>

                    {/* Email */}
                    <Input
                        label="Email Address"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your.email@example.com"
                        required
                        error={errors.email}
                        containerClass='m-8 mt-3'
                        className='placeholder:text-gray-500 text-lg text-white'
                        iconShow={true}
                        iconSVG='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 7.5v9a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 16.5v-9m19.5 0l-9.75 6.75L2.25 7.5m19.5 0A2.25 2.25 0 0019.5 5.25H4.5A2.25 2.25 0 002.25 7.5" /></svg>'
                    />

                    {/* Password Fields */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mx-8'>
                        <PasswordInputBox
                            label="Password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                            error={errors.password}
                            containerClass='mt-3'
                            className='placeholder:text-gray-500 text-lg text-white'
                            iconShow={true}
                            iconSVG='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 10V7a4 4 0 10-8 0v3M5 10h14v9H5z" /></svg>'
                        />

                        <PasswordInputBox
                            label="Confirm Password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            required
                            error={errors.confirmPassword}
                            containerClass='mt-3'
                            className='placeholder:text-gray-500 text-lg text-white'
                            iconShow={true}
                            iconSVG='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 10V7a4 4 0 10-8 0v3M5 10h14v9H5z" /></svg>'
                        />
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mx-8'>
                        {/* Participant Type */}
                        <div className="mb-4 mt-3 w-full">
                            <label className="flex items-center gap-2 text-md font-medium text-white mb-2">
                                <span>
                                    Participant Type <span className="text-orange-500">*</span>
                                </span>
                            </label>
                            <div className='relative'>
                                <select
                                    name="participantType"
                                    value={formData.participantType}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-2 appearance-none py-2.5 border border-gray-300 
                                        rounded-lg focus:ring-2 focus:ring-orange-400 
                                        focus:border-transparent outline-none transition-all 
                                        duration-200 placeholder:text-gray-500 text-lg text-white
                                        bg-stone-800 ${errors.participantType ? 'border-red-500 focus:ring-red-500' : ''
                                        }`}
                                >
                                    <option value="" className="text-gray-500">Select participant type</option>
                                    <option value="IIITH">IIITH</option>
                                    <option value="Non-IIITH">Non-IIITH</option>
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
                            {errors.participantType && (
                                <p className="mt-1 text-sm text-red-600">{errors.participantType}</p>
                            )}
                        </div>

                        {/* Contact Number */}
                        <Input
                            label="Contact Number"
                            type="tel"
                            name="contactNumber"
                            value={formData.contactNumber}
                            onChange={handleChange}
                            placeholder="Enter 10-digit contact number"
                            required
                            error={errors.contactNumber}
                            containerClass='mt-3'
                            className='placeholder:text-gray-500 text-lg text-white'
                            iconShow={true}
                            iconSVG='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>'
                        />
                    </div>

                    {/* Organization Name (conditional) */}
                    {formData.participantType === 'Non-IIITH' && (
                        <Input
                            label="Organization Name"
                            type="text"
                            name="orgName"
                            value={formData.orgName}
                            onChange={handleChange}
                            placeholder="Enter your organization name"
                            error={errors.orgName}
                            containerClass='m-8 mt-3'
                            className='placeholder:text-gray-500 text-lg text-white'
                            iconShow={true}
                            iconSVG='<svg xmlns="http://www.w3.org/2000/svg" 
                            fill="none" viewBox="0 0 24 24" strokeWidth="1.5" 
                            stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" 
                            strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 
                            6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 
                            3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621
                             0 1.125.504 1.125 1.125V21M3 
                             3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 
                             3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>'
                        />
                    )}

                    {/* Terms and Conditions */}
                    <div className='m-8 mt-4'>
                        <CheckBox
                            label="I agree to the terms and conditions"
                            name="agreeToTerms"
                            checked={formData.agreeToTerms}
                            onChange={handleChange}
                            required
                            error={errors.agreeToTerms}
                            labelClass='text-white'
                        />
                    </div>


                    {/* Submit Button */}
                    <div className='m-8'>
                        {errors.backendError && (
                            <p className="mt-1 text-sm text-red-600 justify-center items-center flex mb-1">{errors.backendError}</p>
                        )}
                        <Button
                            type="submit"
                            variant="primary"
                            className='w-full h-10'
                            isbaseStyles={false}
                        >
                            Sign Up
                        </Button>
                    </div>

                    {/* Login Link */}
                    <p className="text-center text-sm text-white mb-8">
                        Already have an account?{' '}
                        <Link to="/login" className="text-orange-300 hover:text-orange-500 font-medium">
                            Log in
                        </Link>
                    </p>
                </form>
            }

            {stage === 1 &&
                <OnboardingStage onComplete={() => navigate('/participant-dashboard')} />
            }
        </div>
    );
};

function OnboardingStage({ onComplete }) {
    const [selectedInterests, setSelectedInterests] = useState([])
    const [topOrganizers, setTopOrganizers] = useState([])
    const [followedOrgs, setFollowedOrgs] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getTopOrganizers()
                setTopOrganizers(res.data.organizers || [])
            } catch (err) {
                console.error('Failed to load organizers:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const toggleInterest = (interest) => {
        setSelectedInterests(prev =>
            prev.includes(interest)
                ? prev.filter(i => i !== interest)
                : [...prev, interest]
        )
    }

    const toggleFollowOrg = (orgId) => {
        setFollowedOrgs(prev =>
            prev.includes(orgId)
                ? prev.filter(id => id !== orgId)
                : [...prev, orgId]
        )
    }

    const handleSubmit = async () => {
        try {
            setSubmitting(true)
            await submitOnboarding({
                interests: selectedInterests,
                followOrganizerIds: followedOrgs,
            })
            onComplete()
        } catch (err) {
            console.error('Onboarding failed:', err)
            onComplete() // still redirect on error
        }
    }

    const handleSkip = () => {
        onComplete()
    }

    return (
        <div className="w-full max-w-lg bg-stone-800 rounded-2xl drop-shadow-stone-950 drop-shadow-xl p-8">
            <div className="mb-6">
                <p className="text-white text-2xl font-semibold">Welcome! Let's personalize your experience</p>
                <p className="text-stone-400 text-sm mt-2">Choose your interests and follow organizers to get relevant event recommendations.</p>
            </div>

            {/* Interests */}
            <div className="mb-6">
                <p className="text-white text-lg font-medium mb-3">Select your interests</p>
                <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map(interest => (
                        <button
                            key={interest}
                            onClick={() => toggleInterest(interest)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all ${selectedInterests.includes(interest)
                                ? 'bg-orange-400 text-black'
                                : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                                }`}
                        >
                            {interest}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Organizers to Follow */}
            <div className="mb-6">
                <p className="text-white text-lg font-medium mb-3">Follow popular organizers</p>
                {loading ? (
                    <p className="text-stone-400 text-sm">Loading...</p>
                ) : topOrganizers.length === 0 ? (
                    <p className="text-stone-400 text-sm">No organizers available yet.</p>
                ) : (
                    <div className="space-y-2">
                        {topOrganizers.map(org => (
                            <button
                                key={org._id}
                                onClick={() => toggleFollowOrg(org._id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${followedOrgs.includes(org._id)
                                    ? 'bg-orange-400/20 border border-orange-400/50'
                                    : 'bg-stone-700 border border-stone-600 hover:border-stone-500'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-stone-600 flex items-center justify-center text-white font-semibold text-lg">
                                        {org.organizerName?.[0]?.toUpperCase() || 'O'}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white text-sm font-medium">{org.organizerName}</p>
                                        <p className="text-stone-400 text-xs">{org.totalRegistrations} total registrations</p>
                                    </div>
                                </div>
                                <span className={`text-sm font-medium ${followedOrgs.includes(org._id) ? 'text-orange-400' : 'text-stone-400'
                                    }`}>
                                    {followedOrgs.includes(org._id) ? '✓ Following' : '+ Follow'}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleSkip}
                    className="flex-1 py-2.5 text-stone-400 hover:text-white text-sm font-medium cursor-pointer transition-colors"
                >
                    Skip for now
                </button>
                <Button
                    variant="primary"
                    isbaseStyles={false}
                    className="flex-1 py-2.5"
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? 'Saving...' : 'Continue'}
                </Button>
            </div>
        </div>
    )
}

export default SignupForm;
