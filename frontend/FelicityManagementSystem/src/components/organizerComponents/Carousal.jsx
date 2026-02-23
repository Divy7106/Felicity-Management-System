import Button from "../Button"
import { useNavigate } from "react-router-dom"

function Carousal({
    eventId,
    eventName,
    eventDescription,
    eventType,
    coverImage,
    status,
    className = "",
}) {
    const navigate = useNavigate()

    // Status badge colors
    const statusColors = {
        draft: "bg-yellow-500",
        published: "bg-blue-500",
        onGoing: "bg-green-500",
        closed: "bg-red-500"
    }

    const statusLabels = {
        draft: "Draft",
        published: "Published",
        onGoing: "On Going",
        closed: "Closed"
    }

    const imageURL = coverImage ? import.meta.env.VITE_BASE_BACKEND_URL + coverImage : null

    const handleButtonClick = (e) => {
        e.stopPropagation()
        if (status === 'draft') {
            navigate(`/create-event/draft/${eventId}`)
        } else {
            navigate(`/create-event/edit/${eventId}`)
        }
    }

    const handleDetails = (e) => {
        e.stopPropagation()
        if (status === 'onGoing') {
            navigate(`/ongoing-events/event/${eventId}`)
        } else {
            navigate(`event/${eventId}`)
        }
    }

    return (
        <div className={`bg-stone-800 rounded-xl overflow-hidden w-full ${className} hover:ring-orange-400 hover:ring-2 transition-all group`}>
            {/* Cover Image or Placeholder */}
            <div className="relative h-48 w-full overflow-hidden bg-stone-700 flex items-center justify-center">
                {imageURL ? (
                    <img
                        src={imageURL}
                        alt={eventName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all"
                        onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = `
                                <svg class="w-20 h-20 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            `
                        }}
                    />
                ) : (
                    <svg className="w-20 h-20 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                )}
                {/* Status Badge */}
                <div className={`absolute top-2 right-2 ${statusColors[status] || 'bg-gray-500'} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                    {statusLabels[status] || status}
                </div>
                {/* Event Type Badge */}
                {eventType && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {eventType}
                    </div>
                )}
            </div>

            {/* Event Details */}
            <div className="p-4 flex flex-col justify-between h-40">
                <div>
                    <h3 className="text-white text-xl font-semibold mb-2 truncate">
                        {eventName || 'Untitled Event'}
                    </h3>
                    <p className="text-stone-300 text-sm">
                        {eventDescription || 'No description available.'}
                    </p>
                </div>
                <div className="flex">

                    <Button
                        className="px-4 mt-2 w-fit py-1"
                        variant="primary"
                        isbaseStyles={false}
                        onClick={handleButtonClick}
                    >
                        {status === 'draft' ? 'Continue' : 'Edit'}
                    </Button>
                    {
                        status !== 'draft' &&
                        <Button
                            className="px-4 mt-2 w-fit py-1 ml-2"
                            variant="primary"
                            isbaseStyles={false}
                            onClick={handleDetails}
                        >
                            Details
                        </Button>
                    }
                </div>
            </div>
        </div>
    )
}

export default Carousal