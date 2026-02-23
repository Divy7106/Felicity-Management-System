import { useRef } from "react";

function AutoResizeTextarea(
    {
        className="",
        placeholder="",
        disabled=false,
        onChange=()=>{},
        onClick=()=>{},
        props
    }
) {
  const textareaRef = useRef(null);

  const handleInput = () => {
    const el = textareaRef.current;
    el.style.height = "auto";           // Reset height
    el.style.height = el.scrollHeight + "px"; // Set to content height
  };

  return (
    <textarea
      ref={textareaRef}
      onInput={handleInput}
      rows={1}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange}
      onClick={onClick}
      {...props}
    />
  );
}

export default AutoResizeTextarea;
