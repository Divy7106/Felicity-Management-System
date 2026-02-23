function TextArea({
    className = "",
    placeholder = "Type Something",
    label = "Text Area",
    iconShow = false,
    iconSVG = "",
    name="",
    labelClass="",
    required=false,
    value="",
    onChange=()=>{},
    containerClass="",
    ...props
}) {
    return (
        <div className={`${containerClass}`}>
            {label && (
                <label
                    htmlFor={name}
                    className={`flex items-center gap-2 text-md font-medium text-white mb-2 ${labelClass}`}
                >
                    {iconShow && iconSVG && (
                        <span dangerouslySetInnerHTML={{ __html: iconSVG }} className='w-5 h-5' />
                    )}
                    <span>
                        {label} {required && <span className="text-orange-500">*</span>}
                    </span>
                </label>
            )}
            <textarea
                required={required}
                className={`${className} rounded-md decoration-none resize-none outline-none`}
                placeholder={placeholder}
                value={value}
                name={name}
                onChange={onChange}
                {...props}
            >
            </textarea>
        </div>
    )
}

export default TextArea;