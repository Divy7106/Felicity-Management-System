import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import { scanQR, manualAttendance, getAttendanceDashboard, getAttendanceCSV, getAttendanceLog } from '../../services/participant'
import Button from '../Button'

function QRScanner({ eventId, 
    eventName, 
    onAttendanceChange, 
    ticketInput, 
    setTicketInput,
    doScan,
    setDoScan,
}) {
    const [activeView, setActiveView] = useState('scanner') // scanner, dashboard, log
    const [scanning, setScanning] = useState(false)
    const [scanResult, setScanResult] = useState(null)
    const [dashboard, setDashboard] = useState(null)
    const [auditLog, setAuditLog] = useState([])
    const [loading, setLoading] = useState(false)
    const [manualOverride, setManualOverride] = useState(null)
    const [overrideReason, setOverrideReason] = useState('')
    const [cameraActive, setCameraActive] = useState(false)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const scanIntervalRef = useRef(null)
    const scanningRef = useRef(false)
    const cooldownRef = useRef(false)
    const handleQRDataRef = useRef(null)

    useEffect(() => {
        return () => {
            stopCamera()
        }
    }, [])

    useEffect(() => {
        if (activeView === 'dashboard') fetchDashboard()
        if (activeView === 'log') fetchAuditLog()
    }, [activeView])

    const fetchDashboard = async () => {
        try {
            setLoading(true)
            const res = await getAttendanceDashboard(eventId)
            setDashboard(res.data.dashboard)
        } catch (err) {
            console.error('Dashboard fetch failed:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchAuditLog = async () => {
        try {
            setLoading(true)
            const res = await getAttendanceLog(eventId)
            setAuditLog(res.data.logs || [])
        } catch (err) {
            console.error('Audit log fetch failed:', err)
        } finally {
            setLoading(false)
        }
    }

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            streamRef.current = stream
            // Render the <video> element first, then connect the stream
            setCameraActive(true)
        } catch (err) {
            alert('Camera access denied or not available. Use manual ticket input or file upload.')
            console.error('Camera error:', err)
        }
    }

    const stopCamera = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current)
            scanIntervalRef.current = null
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        setCameraActive(false)
    }

    const handleQRData = useCallback(async (qrData, method) => {
        if (scanningRef.current || cooldownRef.current) return
        scanningRef.current = true
        setScanning(true)

        // Parse the QR data - it could be a ticket ID directly or a JSON string
        let ticketId = qrData
        try {
            const parsed = JSON.parse(qrData)
            ticketId = parsed.ticketId || parsed.ticket || qrData
        } catch {
            // It's raw text, use as-is (ticket ID)
        }

        try {
            const res = await scanQR(eventId, ticketId, method)
            setScanResult({
                type: 'success',
                msg: res.data.msg,
                participant: res.data.participant,
            })
            if (onAttendanceChange) onAttendanceChange()
        } catch (err) {
            const data = err.response?.data
            setScanResult({
                type: data?.duplicate ? 'duplicate' : 'error',
                msg: data?.msg || 'Scan failed.',
                attendanceTime: data?.attendanceTime,
            })
        } finally {
            scanningRef.current = false
            setScanning(false)
            // Cooldown: ignore scans for 3 seconds after a scan completes
            cooldownRef.current = true
            setTimeout(() => { cooldownRef.current = false }, 3000)
        }
    }, [eventId, onAttendanceChange])

    // Keep ref in sync so the interval always calls the latest version
    useEffect(() => {
        handleQRDataRef.current = handleQRData
    }, [handleQRData])

    // Once cameraActive flips to true and the <video> is mounted, connect the stream
    useEffect(() => {
        if (!cameraActive || !streamRef.current) return

        const connectStream = () => {
            if (videoRef.current) {
                videoRef.current.srcObject = streamRef.current
                videoRef.current.play().catch(() => {})
            }

            // Use BarcodeDetector if available, otherwise fallback to jsQR via canvas
            if ('BarcodeDetector' in window) {
                const detector = new BarcodeDetector({ formats: ['qr_code'] })
                scanIntervalRef.current = setInterval(async () => {
                    if (!videoRef.current || videoRef.current.readyState !== 4) return
                    try {
                        const barcodes = await detector.detect(videoRef.current)
                        if (barcodes.length > 0) {
                            handleQRDataRef.current?.(barcodes[0].rawValue, 'qr-camera')
                        }
                    } catch (e) {
                        // Silently continue scanning
                    }
                }, 500)
            } else {
                // Fallback: draw video frames to hidden canvas and decode with jsQR
                scanIntervalRef.current = setInterval(() => {
                    if (!videoRef.current || videoRef.current.readyState !== 4) return
                    const video = videoRef.current
                    const canvas = canvasRef.current
                    if (!canvas) return
                    canvas.width = video.videoWidth
                    canvas.height = video.videoHeight
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
                    if (code && code.data) {
                        handleQRDataRef.current?.(code.data, 'qr-camera')
                    }
                }, 500)
            }
        }

        // Small delay to ensure the video element is mounted after state update
        requestAnimationFrame(connectStream)

        return () => {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current)
                scanIntervalRef.current = null
            }
        }
    }, [cameraActive, activeView])

    const handleManualScan = () => {
        if (!ticketInput.trim()) return
        handleQRData(ticketInput.trim(), 'manual')
        setTicketInput('')
        setDoScan(false)
    }

    useEffect(() => {
        if(doScan === true) {
            handleManualScan()
        }
    }, [doScan, setDoScan])

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Read image and try to detect QR code
        const img = new Image()
        const reader = new FileReader()

        reader.onload = async (ev) => {
            img.onload = async () => {
                if ('BarcodeDetector' in window) {
                    try {
                        const detector = new BarcodeDetector({ formats: ['qr_code'] })
                        const barcodes = await detector.detect(img)
                        if (barcodes.length > 0) {
                            handleQRData(barcodes[0].rawValue, 'qr-file')
                        } else {
                            setScanResult({ type: 'error', msg: 'No QR code found in the uploaded image.' })
                        }
                    } catch (err) {
                        setScanResult({ type: 'error', msg: 'QR detection failed. Try manual input.' })
                    }
                } else {
                    // Fallback: draw on canvas and try
                    const canvas = canvasRef.current
                    if (canvas) {
                        canvas.width = img.width
                        canvas.height = img.height
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0)
                    }
                    setScanResult({ type: 'error', msg: 'QR detection not supported in this browser. Use manual ticket input.' })
                }
            }
            img.src = ev.target.result
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleManualOverride = async () => {
        if (!manualOverride) return
        try {
            const action = manualOverride.attendance ? 'unmark' : 'mark'
            await manualAttendance(manualOverride._id, action, overrideReason)
            setManualOverride(null)
            setOverrideReason('')
            fetchDashboard()
            if (onAttendanceChange) onAttendanceChange()
        } catch (err) {
            alert(err.response?.data?.msg || 'Override failed.')
        }
    }

    const handleExportCSV = async () => {
        try {
            const res = await getAttendanceCSV(eventId)
            const blob = new Blob([res.data], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${eventName || 'event'}_attendance.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('CSV export failed:', err)
        }
    }

    return (
        <div className="bg-stone-800 rounded-xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h2 className="text-white text-xl sm:text-2xl font-semibold">QR Scanner & Attendance</h2>
                <div className="flex gap-2">
                    {['scanner', 'dashboard', 'log'].map(view => (
                        <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                                activeView === view
                                    ? 'bg-orange-400 text-black'
                                    : 'bg-stone-700 text-stone-300 hover:text-white'
                            }`}
                        >
                            {view === 'scanner' ? 'Scanner' : view === 'dashboard' ? 'Dashboard' : 'Audit Log'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scanner View */}
            {activeView === 'scanner' && (
                <div className="space-y-4">
                    {/* Camera Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-full max-w-md aspect-square bg-stone-900 rounded-xl overflow-hidden">
                            {cameraActive ? (
                                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <p className="text-stone-500 text-sm">Camera not active</p>
                                </div>
                            )}
                            {scanning && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <p className="text-orange-400 font-medium animate-pulse">Processing...</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {!cameraActive ? (
                                <Button variant="primary" isbaseStyles={false} className="px-4 py-2" onClick={startCamera}>
                                    Start Camera
                                </Button>
                            ) : (
                                <Button variant="custom" isbaseStyles={false} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30" onClick={stopCamera}>
                                    Stop Camera
                                </Button>
                            )}

                            {/* File upload option */}
                            <label className="px-4 py-2 bg-stone-700 text-stone-300 rounded-md hover:bg-stone-600 cursor-pointer text-sm font-medium flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Upload QR Image
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Manual Ticket Input */}
                    <div className="flex gap-2 max-w-md mx-auto">
                        <input
                            type="text"
                            value={ticketInput}
                            onChange={(e) => setTicketInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                            placeholder="Enter ticket ID manually..."
                            className="flex-1 px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                        />
                        <Button variant="primary" isbaseStyles={false} className="px-4 py-2" onClick={handleManualScan} disabled={scanning}>
                            Scan
                        </Button>
                    </div>

                    {/* Scan Result */}
                    {scanResult && (
                        <div className={`max-w-md mx-auto p-4 rounded-xl ${
                            scanResult.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
                            scanResult.type === 'duplicate' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                            'bg-red-500/20 border border-red-500/30'
                        }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {scanResult.type === 'success' ? (
                                    <span className="text-green-400 text-xl">✓</span>
                                ) : scanResult.type === 'duplicate' ? (
                                    <span className="text-yellow-400 text-xl">⚠</span>
                                ) : (
                                    <span className="text-red-400 text-xl">✗</span>
                                )}
                                <p className={`font-semibold ${
                                    scanResult.type === 'success' ? 'text-green-400' :
                                    scanResult.type === 'duplicate' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {scanResult.msg}
                                </p>
                            </div>
                            {scanResult.participant && (
                                <div className="text-stone-300 text-sm space-y-1 ml-7">
                                    <p>Name: <span className="text-white">{scanResult.participant.name}</span></p>
                                    <p>Email: <span className="text-white">{scanResult.participant.email}</span></p>
                                    <p>Ticket: <span className="text-orange-400 font-mono">{scanResult.participant.ticketId}</span></p>
                                </div>
                            )}
                            {scanResult.attendanceTime && (
                                <p className="text-stone-400 text-xs ml-7 mt-1">
                                    Previously checked in: {new Date(scanResult.attendanceTime).toLocaleString()}
                                </p>
                            )}
                            <button
                                onClick={() => setScanResult(null)}
                                className="text-stone-500 text-xs mt-2 hover:text-stone-300 cursor-pointer ml-7"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* Dashboard View */}
            {activeView === 'dashboard' && (
                <div>
                    {loading ? (
                        <p className="text-stone-400 text-center py-8">Loading dashboard...</p>
                    ) : dashboard ? (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-stone-700 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-white">{dashboard.totalRegistrations}</p>
                                    <p className="text-stone-400 text-sm mt-1">Total Registrations</p>
                                </div>
                                <div className="bg-stone-700 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-green-400">{dashboard.scannedCount}</p>
                                    <p className="text-stone-400 text-sm mt-1">Scanned / Present</p>
                                </div>
                                <div className="bg-stone-700 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-red-400">{dashboard.notScannedCount}</p>
                                    <p className="text-stone-400 text-sm mt-1">Not Yet Scanned</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="bg-stone-700 rounded-full h-4 overflow-hidden">
                                <div
                                    className="bg-green-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${dashboard.totalRegistrations > 0 ? (dashboard.scannedCount / dashboard.totalRegistrations * 100) : 0}%` }}
                                />
                            </div>
                            <p className="text-stone-400 text-xs text-center">
                                {dashboard.totalRegistrations > 0
                                    ? `${Math.round(dashboard.scannedCount / dashboard.totalRegistrations * 100)}% checked in`
                                    : 'No registrations'}
                            </p>

                            {/* Export Button */}
                            <div className="flex justify-end">
                                <Button variant="primary" isbaseStyles={false} className="px-4 py-2 text-sm" onClick={handleExportCSV}>
                                    Export Attendance CSV
                                </Button>
                            </div>

                            {/* Scanned List */}
                            {dashboard.scanned.length > 0 && (
                                <div>
                                    <h3 className="text-white font-semibold mb-2">Checked In ({dashboard.scanned.length})</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-stone-600">
                                                    <th className="text-stone-400 text-xs pb-2">Name</th>
                                                    <th className="text-stone-400 text-xs pb-2">Ticket</th>
                                                    <th className="text-stone-400 text-xs pb-2">Check-in Time</th>
                                                    <th className="text-stone-400 text-xs pb-2">Method</th>
                                                    <th className="text-stone-400 text-xs pb-2">Override</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dashboard.scanned.map(p => (
                                                    <tr key={p._id} className="border-b border-stone-700/50">
                                                        <td className="py-2 text-white">{p.participantName}</td>
                                                        <td className="py-2 text-orange-400 font-mono text-xs">{p.ticketId}</td>
                                                        <td className="py-2 text-stone-300">{p.attendanceTime ? new Date(p.attendanceTime).toLocaleString() : '—'}</td>
                                                        <td className="py-2 text-stone-400 text-xs">{p.scanMethod}</td>
                                                        <td className="py-2">
                                                            <button
                                                                onClick={() => setManualOverride(p)}
                                                                className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                                                            >
                                                                Unmark
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Not Scanned List */}
                            {dashboard.notScanned.length > 0 && (
                                <div>
                                    <h3 className="text-white font-semibold mb-2">Not Yet Scanned ({dashboard.notScanned.length})</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-stone-600">
                                                    <th className="text-stone-400 text-xs pb-2">Name</th>
                                                    <th className="text-stone-400 text-xs pb-2">Email</th>
                                                    <th className="text-stone-400 text-xs pb-2">Ticket</th>
                                                    <th className="text-stone-400 text-xs pb-2">Override</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dashboard.notScanned.map(p => (
                                                    <tr key={p._id} className="border-b border-stone-700/50">
                                                        <td className="py-2 text-white">{p.participantName}</td>
                                                        <td className="py-2 text-stone-300">{p.participantEmail}</td>
                                                        <td className="py-2 text-orange-400 font-mono text-xs">{p.ticketId}</td>
                                                        <td className="py-2">
                                                            <button
                                                                onClick={() => setManualOverride(p)}
                                                                className="text-xs text-green-400 hover:text-green-300 cursor-pointer"
                                                            >
                                                                Mark Present
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-stone-400 text-center py-8">Failed to load dashboard.</p>
                    )}
                </div>
            )}

            {/* Audit Log View */}
            {activeView === 'log' && (
                <div>
                    {loading ? (
                        <p className="text-stone-400 text-center py-8">Loading audit log...</p>
                    ) : auditLog.length === 0 ? (
                        <p className="text-stone-400 text-center py-8">No attendance actions logged yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-stone-600">
                                        <th className="text-stone-400 text-xs pb-2">Time</th>
                                        <th className="text-stone-400 text-xs pb-2">Ticket</th>
                                        <th className="text-stone-400 text-xs pb-2">Action</th>
                                        <th className="text-stone-400 text-xs pb-2">Method</th>
                                        <th className="text-stone-400 text-xs pb-2">Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLog.map(log => (
                                        <tr key={log._id} className="border-b border-stone-700/50">
                                            <td className="py-2 text-stone-300 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="py-2 text-orange-400 font-mono text-xs">{log.ticketId}</td>
                                            <td className="py-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    log.action === 'scan' ? 'bg-green-500/20 text-green-400' :
                                                    log.action === 'manual-mark' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-2 text-stone-400 text-xs">{log.scanMethod}</td>
                                            <td className="py-2 text-stone-400 text-xs">{log.reason || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Override Modal */}
            {manualOverride && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setManualOverride(null); setOverrideReason('') }}>
                    <div className="bg-stone-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-white text-lg font-semibold mb-4">
                            {manualOverride.attendance ? 'Unmark' : 'Mark'} Attendance
                        </h3>
                        <p className="text-stone-400 text-sm mb-1">Participant: <span className="text-white">{manualOverride.participantName}</span></p>
                        <p className="text-stone-400 text-sm mb-4">Ticket: <span className="text-orange-400 font-mono">{manualOverride.ticketId}</span></p>

                        <label className="text-stone-400 text-sm mb-1 block">Reason (required for audit)</label>
                        <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="Enter reason for override..."
                            className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:ring-2 focus:ring-orange-400 outline-none text-sm mb-4"
                        />

                        <div className="flex gap-2 justify-end">
                            <Button variant="custom" isbaseStyles={false} className="px-4 py-2 bg-stone-700 text-stone-300 rounded-md hover:bg-stone-600" onClick={() => { setManualOverride(null); setOverrideReason('') }}>
                                Cancel
                            </Button>
                            <Button variant="primary" isbaseStyles={false} className="px-4 py-2" onClick={handleManualOverride} disabled={!overrideReason.trim()}>
                                Confirm Override
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default QRScanner
