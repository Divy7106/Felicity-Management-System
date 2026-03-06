import Input from "../Input";
import { useState } from "react";
import Button from "../Button";
import TextArea from "../TextArea";
import { createOrganizer } from "../../services/org";
import { Link } from 'react-router-dom'

function OrgCreator() {

    const [formData, setFormData] = useState({
        organizerName: "",
        description: "",
        category: "",
        contactEmail: "",
    })

    const [errors, setErrors] = useState({})
    const [createdOrganizer, setCreatedOrganizer] = useState({})

    const [stage, setStage] = useState(0)

    const category = ["Technical", "Cultural", "Sports",
        "Literary", "Design", "Management",
        "Social/Community", "Gaming", "Fest Team", "Other"]

    const backTocreateOrganizer = () => {
        setStage(0)
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        console.log(value)
        setFormData(prev => ({ ...prev, [name]: value }))
        setErrors((prev) => ({ ...prev, [name]: '' }))
    }

    const validateForm = () => {
        const newErrors = {};

        // Contact Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.contactEmail) {
            newErrors.contactEmail = 'Email is required';
        } else if (!emailRegex.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Invalid contact email format';
        }

        // Organizer Name
        if (formData.organizerName.length <= 3) {
            newErrors.organizerName = 'Organizer name must be at least 4 characters long.'
        }

        // Description
        if (formData.description.length <= 14 || formData.description.length > 1000) {
            newErrors.organizerName = 'Organizer name must be at least 15 characters long.'
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (validateForm()) {
            const organizerData = { ...formData, role: "Organizer" }
            await createOrganizer(organizerData)
                .then((r) => {
                    setCreatedOrganizer(r.data.response)
                    setStage(1)
                })
                .catch((err) => {
                    setErrors((prev) => {
                        return { ...prev, backendError: err.response.data.error }
                    })
                })
        }
    }

    return (
        <div className="w-full max-w-md lg:max-w-lg mx-auto bg-stone-800 drop-shadow-stone-950 drop-shadow-xl justify-center items-center rounded-2xl mb-20">
            {stage === 0 &&
                <form className="w-full">
                    <div className="mb-6">
                        <p className="text-white text-3xl mt-15 ml-8">Create Organizer</p>
                    </div>

                    {/* Organizer Name */}
                    <Input
                        onChange={handleChange}
                        label="Organizer Name"
                        name="organizerName"
                        value={formData.organizerName}
                        // onChange={handleChange}
                        placeholder="Type Organizer Name"
                        required
                        error={errors.organizerName}
                        containerClass='m-8'
                        className='placeholder:text-gray-500 text-lg text-white'
                        iconShow={true}
                        iconSVG='<svg xmlns="http://www.w3.org/2000/svg" fill="none" 
                viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
                className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" 
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75
                 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 
                 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 
                 3.75h.008v.008h-.008v-.008zm0 
                3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>'
                    />
                    <div className="m-8">
                        <TextArea
                            onChange={handleChange}
                            className="w-full pt-2 pl-4 ring-1 focus:ring-orange-400 focus:ring-2
                         placeholder:text-gray-500 h-25 caret-white text-white text-lg"
                            placeholder="Type Description"
                            label="Description"
                            name="description"
                            value={formData.description}
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

                        <div className='relative mt-5'>
                            <label className="flex items-center gap-2 text-md font-medium text-white mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>

                                <span>
                                    Participant Type <span className="text-orange-500">*</span>
                                </span>
                            </label>
                            <select
                                onChange={handleChange}
                                name="category"
                                value={formData.category}
                                required
                                className={`w-full px-4 appearance-none py-2.5 border border-gray-300 
                                        rounded-lg focus:ring-2 focus:ring-orange-400
                                        focus:border-transparent outline-none transition-all 
                                        duration-200 placeholder:text-gray-500 text-lg text-white
                                        bg-stone-800 ${errors.category ? 'border-red-500 focus:ring-red-500' : ''
                                    }`}
                            >
                                <option value="" className="text-stone-600">Select Organizer Category</option>
                                {
                                    category.map((key) => {
                                        return (
                                            <option key={key} value={key}>{key}</option>
                                        )
                                    })
                                }
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
                    </div>

                    <Input
                        label="Contact Email"
                        type="email"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        placeholder="your.email@example.com"
                        required
                        error={errors.contactEmail}
                        containerClass='m-8 mt-3'
                        className='placeholder:text-gray-500 text-lg text-white'
                        iconShow={true}
                        iconSVG='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 7.5v9a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 16.5v-9m19.5 0l-9.75 6.75L2.25 7.5m19.5 0A2.25 2.25 0 0019.5 5.25H4.5A2.25 2.25 0 002.25 7.5" /></svg>'
                    />

                    {/* Submit Button */}
                    <div className='m-8'>
                        {errors.backendError && (
                            <p className="mt-1 text-sm text-red-600 justify-center items-center flex mb-2">{errors.backendError}</p>
                        )}
                        <Button
                            type="submit"
                            variant="primary"
                            className='w-full h-10'
                            isbaseStyles={false}
                            onClick={handleSubmit}
                        >
                            Create Organizer
                        </Button>
                    </div>
                </form>
            }

            {stage === 1 && createOrganizer &&
                <div>
                    <div className="w-full">
                        <h1 className="text-white text-3xl m-4 mt-7">Organization Created Succefully</h1>
                    </div>
                    <div className="bg-stone-900 m-4 px-2 rounded-t-2xl mt-7 mb-0">
                        <p className="text-2xl text-white ml-4 mr-4 py-2">{createdOrganizer.organizerName}</p>
                        <p className="text-lg text-stone-500 ml-4 mr-4">{createdOrganizer.description.slice(0, 200) + "..."}</p>
                    </div>
                    <div className="mt-0 m-4 flex rounded-lg overflow-x-scroll">
                        <div className="w-fit bg-stone-900 rounded-bl-xl pl-2">
                            <p className="text-xl text-white ml-4 mr-4 mt-6 mb-2">Category: </p>
                            <p className="text-xl text-white ml-4 mr-4 mb-2">Email: </p>
                            <p className="text-xl text-white ml-4 mr-4 mb-2">Password: </p>
                            <p className="text-xl text-white ml-4 mr-4 mb-6">Contact Email: </p>
                        </div>
                        <div className="bg-stone-900 rounded-br-2xl w-full">
                            <p className="text-xl text-stone-600 ml-4 mr-4 mt-6 mb-2">{createdOrganizer.category}</p>
                            <p className="text-xl text-stone-600 ml-4 mr-4 mb-2">{createdOrganizer.email}</p>
                            <p className="text-xl text-orange-400 ml-4 mr-4 mb-2 font-mono">{createdOrganizer.generatedPassword}</p>
                            <p className="text-xl text-stone-600 ml-4 mr-4 mb-6">{createdOrganizer.contactEmail}</p>
                        </div>
                    </div>
                    <p className="text-lg text-stone-500 m-4 px-3">Credentials has been sent to the Organizer through Contact email.</p>
                    <div className="m-5 flex flex-col sm:flex-row gap-2">
                        <Button variant="primary" isbaseStyles={false} className="p-3 h-10 w-full text-nowrap" onClick={backTocreateOrganizer}>Create Organizer</Button>
                        <Link to="/admin-dashboard" className="p-3 h-10 w-full cursor-pointer text-nowrap text-lg text-white bg-orange-400 flex justify-center duration-150 items-center transition-all
                         hover:text-black rounded-md 
                         active:bg-orange-500">
                            Back To DashBoard
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="ml-1"
                            >
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </Link>

                    </div>
                </div>
            }
        </div>
    )
}

export default OrgCreator;