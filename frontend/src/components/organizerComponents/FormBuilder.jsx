import Button from "../Button"
import { useState, useRef, useEffect } from "react"
import AutoResizeTextarea from "./AutoResizeTextArea"
import CheckBox from "../CheckBox"
import Input from "../Input"

function FormBuilder({
    regForm,
    setRegForm,
    eventName = "",
    eventDescription = "",
    title = "Create Registration Form",
}) {

    const [currentFeild, setCurrentField] = useState(null)
    const containerRef = useRef(null)

    // FOR NOTE :
    const AddNoteField = () => {
        setRegForm(prev => [...prev, {
            fieldId: prev.length + 1,
            fieldType: "note",
            label: "",
            placeholder: "",
            isRequired: null,
            options: [], // for check-box and drop-down menu
            allowedFileFormats: [], // for file-format
        }])
        setCurrentField(regForm.length + 1)
    }

    const handleNoteFieldChange = (fieldId, e) => {
        const value = e.target?.value
        const updated = [...regForm]
        updated[fieldId - 1].label = value
        setRegForm(updated)
    }

    // FOR INPUT BOX :
    const AddInputFeild = () => {
        setRegForm(prev => [...prev, {
            fieldId: prev.length + 1,
            fieldType: "text",
            label: "",
            placeholder: "",
            isRequired: false,
            options: [],
            allowedFileFormats: [],
        }])
        setCurrentField(regForm.length + 1)
    }

    const handleInputFieldChange = (fieldId, field, value) => {
        const updated = [...regForm]
        updated[fieldId - 1][field] = value
        setRegForm(updated)
    }

    // FOR DROP DOWN MENU :
    const AddDropDownField = () => {
        setRegForm(prev => [...prev, {
            fieldId: prev.length + 1,
            fieldType: "dropdown",
            label: "",
            placeholder: "",
            isRequired: false,
            options: [],
            allowedFileFormats: [],
        }])
        setCurrentField(regForm.length + 1)
    }

    const [optionInput, setOptionInput] = useState("")

    const handleAddOption = (fieldId) => {
        const val = optionInput.trim()
        if (!val) return
        const updated = [...regForm]
        if (!updated[fieldId - 1].options.includes(val)) {
            updated[fieldId - 1].options.push(val)
            setRegForm(updated)
        }
        setOptionInput("")
    }

    // FOR CHECK BOX :
    const AddCheckBoxField = () => {
        setRegForm(prev => [...prev, {
            fieldId: prev.length + 1,
            fieldType: "checkbox",
            label: "",
            placeholder: "",
            isRequired: false,
            options: [],
            allowedFileFormats: [],
        }])
        setCurrentField(regForm.length + 1)
    }

    // FOR FILE INPUT :
    const AddFileField = () => {
        setRegForm(prev => [...prev, {
            fieldId: prev.length + 1,
            fieldType: "file",
            label: "",
            placeholder: "",
            isRequired: false,
            options: [],
            allowedFileFormats: [],
        }])
        setCurrentField(regForm.length + 1)
    }

    const handleFileFormatToggle = (fieldId, format) => {
        const updated = [...regForm]
        if (updated[fieldId - 1].allowedFileFormats.includes(format)) {
            updated[fieldId - 1].allowedFileFormats = updated[fieldId - 1].allowedFileFormats.filter(f => f !== format)
        } else {
            updated[fieldId - 1].allowedFileFormats.push(format)
        }
        setRegForm(updated)
    }

    const handleDeleteField = (fieldId) => {
        const updated = regForm.filter(field => field.fieldId !== fieldId)
        updated.forEach((field, index) => {
            field.fieldId = index + 1
        })
        setRegForm(updated)
        setCurrentField(null)
    }

    const handleMoveUp = (fieldId) => {
        const idx = fieldId - 1
        if (idx <= 0) return
        const updated = [...regForm]
        ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
        updated.forEach((field, i) => { field.fieldId = i + 1 })
        setRegForm(updated)
        setCurrentField(fieldId - 1)
    }

    const handleMoveDown = (fieldId) => {
        const idx = fieldId - 1
        if (idx >= regForm.length - 1) return
        const updated = [...regForm]
        ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
        updated.forEach((field, i) => { field.fieldId = i + 1 })
        setRegForm(updated)
        setCurrentField(fieldId + 1)
    }

    const renderReorderControls = (fieldId) => (
        <div className="flex items-center gap-1">
            <button
                onClick={() => handleMoveUp(fieldId)}
                disabled={fieldId === 1}
                className="p-2 hover:bg-stone-700 rounded-lg transition-colors disabled:opacity-30"
                title="Move up"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-white">
                    <path d="M18 15l-6-6-6 6" />
                </svg>
            </button>
            <button
                onClick={() => handleMoveDown(fieldId)}
                disabled={fieldId === regForm.length}
                className="p-2 hover:bg-stone-700 rounded-lg transition-colors disabled:opacity-30"
                title="Move down"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-white">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>
            <button
                onClick={() => handleDeleteField(fieldId)}
                className="p-2 hover:bg-stone-700 hover:bg-opacity-20 rounded-lg transition-colors"
                title="Delete field"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-red-500">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
            </button>
        </div>
    )

    useEffect(() => {
        const onDocClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setCurrentField(null)
            }
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    return (
        <div className="overflow-hidden">
            <h1 className="text-white text-3xl px-5 py-4 mt-3 font-semibold">{title}</h1>
            <div className="flex mb-5" ref={containerRef}>
                <div className="bg-stone-800 w-fit h-fit rounded-xl text-white ml-5
         flex justify-center items-center flex-col flex-shrink-0">

                    <Button
                        variant="custom"
                        isbaseStyles={false}
                        className="hover:bg-stone-700 rounded-xl w-full px-2 py-2"
                        toolTip="Add Note"
                        onClick={AddNoteField}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                            <path d="M14 2v6h6" />
                            <path d="M8 13h8" />
                            <path d="M8 17h8" />
                        </svg>

                    </Button>

                    <Button
                        variant="custom"
                        isbaseStyles={false}
                        className="hover:bg-stone-700 rounded-xl w-full px-2 py-2"
                        toolTip="Add Input Field"
                        onClick={AddInputFeild}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect x="3" y="6" width="18" height="12" rx="2" />
                            <line x1="6" y1="10" x2="14" y2="10" />
                            <line x1="6" y1="14" x2="12" y2="14" />
                        </svg>
                    </Button>

                    <Button
                        variant="custom"
                        isbaseStyles={false}
                        className="hover:bg-stone-700 rounded-xl w-full px-2 py-2"
                        toolTip="Add Drop Down Menu"
                        onClick={AddDropDownField}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M6 9l6 6 6-6" />
                        </svg>

                    </Button>

                    <Button
                        variant="custom"
                        isbaseStyles={false}
                        className="hover:bg-stone-700 rounded-xl w-full px-2 py-2"
                        toolTip="Add Check Box"
                        onClick={AddCheckBoxField}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                            <path d="M8 12l3 3 5-6" />
                        </svg>
                    </Button>

                    <Button
                        variant="custom"
                        isbaseStyles={false}
                        className="hover:bg-stone-700 rounded-xl w-full px-2 py-2"
                        toolTip="Add File Upload"
                        onClick={AddFileField}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                            <path d="M12 17V11" />
                            <path d="M9 14l3-3 3 3" />
                        </svg>

                    </Button>
                </div>

                {/**Registration Form*/}
                <div className="bg-stone-800 w-full min-w-0 rounded-xl ml-5 mr-5 py-5 overflow-hidden">
                    <h1 className={`${eventName === "" ? "text-stone-500" : "text-white"} text-3xl ml-5 mr-5`}>{eventName === "" ? "Event Name" : eventName}</h1>
                    <h1 className={`${eventDescription === "" ? "text-stone-500" : "text-stone-400"} text-lg ml-5 mb-6 mr-5 text-wrap`}>{eventDescription === "" ? "Event Description" : eventDescription}</h1>
                    {
                        regForm.map((field) => {
                            if (field.fieldId === currentFeild) {
                                // FOR NOTE
                                if (field.fieldType === 'note') {
                                    return (
                                        <div className="text-white text-3xl ml-5 mr-5 py-1 mt-3" key={field.fieldId}>
                                            <AutoResizeTextarea
                                                className={`rounded-md decoration-none 
                                                    outline-none bg-stone-700 w-full px-5 py-3 text-xl resize-none`}
                                                placeholder="Add Note"
                                                value={field.label}
                                                onChange={(e) => handleNoteFieldChange(field.fieldId, e)}
                                            >
                                            </AutoResizeTextarea>
                                            <div className="flex justify-end mt-2">
                                                {renderReorderControls(field.fieldId)}
                                            </div>
                                        </div>
                                    )
                                }

                                // FOR INPUT
                                if (field.fieldType === 'text') {
                                    return (
                                        <div className={`text-white text-xl ml-5 mr-5 py-1`} key={field.fieldId}>
                                            {/* Label Input */}
                                            <input
                                                className={`bg-stone-800 w-full border-b-2 border-stone-600 focus:border-orange-400 outline-none mt-4 pb-1 text-lg`}
                                                placeholder="Add Label"
                                                value={field.label}
                                                onChange={(e) => handleInputFieldChange(field.fieldId, 'label', e.target.value)}
                                            />

                                            {/* Preview Input */}
                                            <input
                                                className={`w-full px-2 py-2.5 border border-gray-300 rounded-lg mt-3
                                                    focus:ring-2 focus:ring-orange-400 focus:border-transparent 
                                                    outline-none transition-all duration-200 placeholder:text-gray-300 
                                                    text-lg text-white bg-stone-700 pointer-events-none`}
                                                placeholder={field.placeholder || "Input Field"}
                                                disabled
                                            />

                                            {/* Controls */}
                                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                                <CheckBox
                                                    name={`required-${field.fieldId}`}
                                                    label="Required"
                                                    checked={field.isRequired}
                                                    onChange={(e) => handleInputFieldChange(field.fieldId, 'isRequired', e.target.checked)}
                                                    className="bg-white"
                                                />
                                                <input
                                                    className={`flex-1 min-w-[120px] max-w-[300px] px-2 py-2 border border-gray-300 rounded-lg
                                                        focus:ring-2 focus:ring-orange-400 focus:border-transparent 
                                                        outline-none transition-all duration-200 placeholder:text-gray-300 
                                                        text-lg text-white bg-stone-700`}
                                                    placeholder="Add placeholder"
                                                    value={field.placeholder}
                                                    onChange={(e) => handleInputFieldChange(field.fieldId, 'placeholder', e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') setCurrentField(null)
                                                    }}
                                                />
                                                {renderReorderControls(field.fieldId)}
                                            </div>


                                        </div>
                                    )
                                }

                                // FOR DROP DOWN
                                if (field.fieldType === 'dropdown') {
                                    return (
                                        <div className={`text-white text-xl ml-5 mr-5 py-1 mt-3`} key={field.fieldId}>
                                            {/* Label Input */}
                                            <input
                                                className={`bg-stone-800 w-full border-b-2 border-stone-600 focus:border-orange-400 outline-none mt-4 pb-1 text-lg`}
                                                placeholder="Add Label"
                                                value={field.label}
                                                onChange={(e) => handleInputFieldChange(field.fieldId, 'label', e.target.value)}
                                            />

                                            {/* Preview Dropdown */}
                                            <div className='relative mt-3'>
                                                <select
                                                    className={`w-full px-2 appearance-none py-2.5 border border-gray-300 
                                                        rounded-lg focus:ring-2 focus:ring-orange-400 
                                                        focus:border-transparent outline-none transition-all 
                                                        duration-200 placeholder:text-gray-300 text-lg text-white
                                                        bg-stone-700`}
                                                >
                                                    <option value="" className="text-gray-500">Select an option</option>
                                                    {field.options.map((opt, idx) => (
                                                        <option key={idx} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="pointer-events-none w-4 h-4 text-white absolute right-2 top-1/2 -translate-y-1/2"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                                <CheckBox
                                                    name={`required-${field.fieldId}`}
                                                    checked={field.isRequired}
                                                    onChange={(e) => handleInputFieldChange(field.fieldId, 'isRequired', e.target.checked)}
                                                    label="Required"
                                                />
                                                <input
                                                    className={`flex-1 min-w-[120px] max-w-[300px] px-2 py-2 border border-gray-300 rounded-lg
                                                        focus:ring-2 focus:ring-orange-400 focus:border-transparent 
                                                        outline-none transition-all duration-200 placeholder:text-gray-300 
                                                        text-lg text-white bg-stone-700`}
                                                    placeholder="Add Option"
                                                    value={optionInput}
                                                    onChange={(e) => setOptionInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddOption(field.fieldId)}
                                                />
                                                <Button
                                                    isbaseStyles={false}
                                                    variant="primary"
                                                    onClick={() => handleAddOption(field.fieldId)}
                                                    className="px-4 py-2 text-nowrap"
                                                >
                                                    Add Option
                                                </Button>
                                                {renderReorderControls(field.fieldId)}
                                            </div>

                                            {/* Display Options */}
                                            {field.options.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {field.options.map((opt, idx) => (
                                                        <span key={idx} className="px-3 py-1 bg-stone-700 rounded-full text-sm">
                                                            {opt}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}


                                        </div>
                                    )
                                }

                                // FOR CHECK BOX
                                if (field.fieldType === 'checkbox') {
                                    return (
                                        <div className={`text-white text-xl ml-5 mr-5 py-1 mt-3`} key={field.fieldId}>
                                            {/* Label Input */}
                                            <input
                                                className={`bg-stone-800 w-full border-b-2 border-stone-600 focus:border-orange-400 outline-none mt-4 pb-1 text-lg`}
                                                placeholder="Add Label"
                                                value={field.label}
                                                onChange={(e) => handleInputFieldChange(field.fieldId, 'label', e.target.value)}
                                            />

                                            {/* Preview Checkboxes */}
                                            <div className='mt-3 flex flex-wrap gap-5'>
                                                {field.options.length > 0 ? (
                                                    field.options.map((opt, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                className="pointer-events-none w-4 h-4"
                                                            />
                                                            <span>{opt}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-gray-500 text-sm">No options added yet</div>
                                                )}
                                            </div>

                                            {/* Controls */}
                                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                                <CheckBox
                                                    name={`required-${field.fieldId}`}
                                                    checked={field.isRequired}
                                                    onChange={(e) => handleInputFieldChange(field.fieldId, 'isRequired', e.target.checked)}
                                                    label="Required"
                                                />
                                                <input
                                                    className={`flex-1 min-w-[120px] max-w-[300px] px-2 py-2 border border-gray-300 rounded-lg
                                                        focus:ring-2 focus:ring-orange-400 focus:border-transparent 
                                                        outline-none transition-all duration-200 placeholder:text-gray-300 
                                                        text-lg text-white bg-stone-700`}
                                                    placeholder="Add Option"
                                                    value={optionInput}
                                                    onChange={(e) => setOptionInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddOption(field.fieldId)}
                                                />
                                                <Button
                                                    isbaseStyles={false}
                                                    variant="primary"
                                                    onClick={() => handleAddOption(field.fieldId)}
                                                    className="px-4 py-2 text-nowrap"
                                                >
                                                    Add Option
                                                </Button>
                                                {renderReorderControls(field.fieldId)}
                                            </div>

                                        </div>
                                    )
                                }

                                // FOR FILE INPUT
                                if (field.fieldType === 'file') {
                                    const fileFormats = ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG', 'TXT']
                                    return (
                                        <div className={`text-white text-xl ml-5 mr-5 py-1 mt-3`} key={field.fieldId}>
                                            {/* Label Input */}
                                            <input
                                                className={`bg-stone-800 w-full border-b-2 border-stone-600 focus:border-orange-400 outline-none mt-4 pb-1 text-lg`}
                                                placeholder="Add Label"
                                                value={field.label}
                                                onChange={(e) => handleInputFieldChange(field.fieldId, 'label', e.target.value)}
                                            />

                                            {/* Preview File Upload */}
                                            <div className='mt-3'>
                                                <input
                                                    type="file"
                                                    className={`w-full px-2 py-2.5 border border-gray-300 rounded-lg
                                                        focus:ring-2 focus:ring-orange-400 focus:border-transparent 
                                                        outline-none transition-all duration-200 
                                                        text-lg text-white bg-stone-700 pointer-events-none
                                                        file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                                                        file:text-sm file:font-semibold file:bg-orange-400
                                                        file:text-white`}
                                                    disabled
                                                />
                                            </div>

                                            {/* File Format Checkboxes */}
                                            <div className="mt-3">
                                                <label className="text-sm text-gray-400 mb-2 block">Allowed File Formats:</label>
                                                <div className="flex flex-wrap gap-3">
                                                    {fileFormats.map((format) => (
                                                        <CheckBox
                                                            key={format}
                                                            name={`format-${field.fieldId}-${format}`}
                                                            checked={field.allowedFileFormats.includes(format)}
                                                            onChange={() => handleFileFormatToggle(field.fieldId, format)}
                                                            label={format}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Required Checkbox */}
                                            <div className="mt-3 flex justify-between items-center">
                                                <CheckBox
                                                    name={`required-${field.fieldId}`}
                                                    checked={field.isRequired}
                                                    onChange={(e) => handleInputFieldChange(field.fieldId, 'isRequired', e.target.checked)}
                                                    label="Required"
                                                />
                                                {renderReorderControls(field.fieldId)}
                                            </div>

                                        </div>
                                    )
                                }
                            } else {
                                // FOR NOTE
                                if (field.fieldType === 'note') {
                                    return (
                                        <div className="text-white text-3xl ml-5 mr-5 py-1 mt-3" key={field.fieldId} onClick={() => setCurrentField(field.fieldId)}>
                                            <AutoResizeTextarea
                                                className={`rounded-md decoration-none 
                                                    outline-none bg-stone-800 w-full py-3 text-xl resize-none pointer-events-none`}
                                                placeholder="Add Note"
                                                value={field.label}
                                                disabled={true}
                                            >
                                            </AutoResizeTextarea>
                                        </div>
                                    )
                                }

                                // FOR INPUT
                                if (field.fieldType === 'text') {
                                    return (
                                        <div className={`text-white text-xl ml-5 mr-5 py-1 mt-3`} key={field.fieldId} onClick={() => setCurrentField(field.fieldId)}>
                                            {field.label && <label className="text-md text-gray-300 mb-1 block">{field.label}{field.isRequired && <span className="text-orange-500">*</span>}</label>}
                                            <input
                                                className={`w-full px-2 py-2.5 border border-gray-300 rounded-lg
                                                    outline-none text-lg text-white bg-stone-800 pointer-events-none`}
                                                placeholder={field.placeholder || "Input Field"}
                                                disabled={true}
                                            />
                                        </div>
                                    )
                                }

                                // FOR DROP DOWN
                                if (field.fieldType === 'dropdown') {
                                    return (
                                        <div className={`text-white text-xl ml-5 mr-5 py-1 mt-3`} key={field.fieldId} onClick={() => setCurrentField(field.fieldId)}>
                                            {field.label && <label className="text-md text-gray-300 mb-1 block">{field.label}{field.isRequired && <span className="text-orange-500">*</span>}</label>}
                                            <div className='relative'>
                                                <select
                                                    className={`w-full px-2 appearance-none py-2.5 border border-gray-300 
                                                        rounded-lg outline-none text-lg text-white bg-stone-800 pointer-events-none`}
                                                    disabled
                                                >
                                                    <option value="">Select an option</option>
                                                    {field.options.map((opt, idx) => (
                                                        <option key={idx} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="pointer-events-none w-4 h-4 text-white absolute right-2 top-1/2 -translate-y-1/2"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    )
                                }

                                // FOR CHECK BOX
                                if (field.fieldType === 'checkbox') {
                                    return (
                                        <div className={`text-white text-xl ml-5 mr-5 py-1 mt-3`} key={field.fieldId} onClick={() => setCurrentField(field.fieldId)}>
                                            {field.label && <label className="text-md text-gray-300 mb-1 block">{field.label}{field.isRequired && <span className="text-orange-500">*</span>}</label>}
                                            <div className='flex flex-wrap gap-5'>
                                                {field.options.length !== 0 && field.options.map((opt, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 pointer-events-none">
                                                        <input
                                                            type="checkbox"
                                                            disabled
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{opt}</span>
                                                    </div>
                                                ))}
                                                {field.options.length === 0 &&
                                                    <div className="flex items-center gap-2 cursor-pointer bg-stone-700 px-4 py-2 rounded-xl hover:bg-orange-400">
                                                        No CheckBox Added
                                                    </div>
                                                }
                                            </div>
                                        </div>
                                    )
                                }

                                // FOR FILE INPUT
                                if (field.fieldType === 'file') {
                                    return (
                                        <div className={`text-white text-xl ml-5 mr-5 py-1 mt-3`} key={field.fieldId} onClick={() => setCurrentField(field.fieldId)}>
                                            {field.label && <label className="text-md text-gray-300 mb-1 block">{field.label}{field.isRequired && <span className="text-orange-500">*</span>}</label>}
                                            <input
                                                type="file"
                                                className={`w-full px-2 py-2.5 border border-gray-300 rounded-lg
                                                    outline-none text-lg text-white bg-stone-800 pointer-events-none
                                                    file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                                                    file:text-sm file:font-semibold file:bg-orange-400
                                                    file:text-white`}
                                                disabled
                                            />
                                            {field.allowedFileFormats.length > 0 && (
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Allowed: {field.allowedFileFormats.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    )
                                }

                            }
                        })
                    }
                </div>
            </div>
        </div>
    )
}

export default FormBuilder