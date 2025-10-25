import React, {useRef, useState, useEffect} from "react";
import {HiOutlineTrash, HiOutlinePencilAlt, HiCursorClick} from "react-icons/hi";
import {supabase} from "../supabaseClient.js";

export default function VideoPlayer() {
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);
    const [markers, setMarkers] = useState([]);
    const [newLabel, setNewLabel] = useState("");
    const [newCategory, setNewCategory] = useState("Goal");
    const [player, setPlayer] = useState("");
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [activeFilters, setActiveFilters] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editLabel, setEditLabel] = useState("");
    const [editCategory, setEditCategory] = useState("");

    // Category definitions and colors
    const categoryColors = {
        BadPass: "bg-purple-500",
        Contact: "bg-purple-500",
        Footwork: "bg-purple-500",
        Feed: "bg-purple-500",
        Goal: "bg-purple-500",
        HeldBall: "bg-blue-500",
        Intercept: "bg-green-500",
        Miss: "bg-purple-500",
        Obstruction: "bg-purple-500",
        Pickup: "bg-purple-500",
        LostRebound: "bg-purple-500",
        Rebound: "bg-red-500",
        Tip: "bg-yellow-500",
        OppositionError: "bg-purple-500",
        HandlingError: "bg-purple-500",
        GeneralError: "bg-purple-500",
    };

    // Player Definitions and positions
    const players = {
        GK: "Nina",
        GD: "Olivia",
        WD: "Ariane",
        C: "Olivia",
        WA: "Matilda",
        GA: "Amelle",
        GS: "Pearl"
    }

    // Load markers from localStorage
    useEffect(() => {
        getMarkers();
        // const saved = JSON.parse(localStorage.getItem("markers") || "[]");
        // setMarkers(saved);
    }, []);

    async function getMarkers() {
        const {data} = await supabase.from("markers").select();
        setMarkers(data);
    }

    // Save markers to localStorage
    useEffect(() => {
        localStorage.setItem("markers", JSON.stringify(markers));
    }, [markers]);

    const handleAddMarker = () => {
        const currentTime = videoRef.current.currentTime;
        if (!newLabel || !duration) return;
        setMarkers([
            ...markers,
            {time: currentTime, label: newLabel, category: newCategory},
        ]);
        setNewLabel("");
    };

    const handleJump = (time) => {
        videoRef.current.currentTime = time;
        videoRef.current.play();
    };

    const fancyTimeStamp = (seconds) => {
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds.toFixed(0) % 60;
        return `${minutes}:${secs}`;
    }

    const handleLoadedMetadata = () => setDuration(videoRef.current.duration);
    const handleTimeUpdate = () => setCurrentTime(videoRef.current.currentTime);

    // Filters
    const toggleFilter = (category) => {
        setActiveFilters((prev) =>
            prev.includes(category)
                ? prev.filter((c) => c !== category)
                : [...prev, category]
        );
    };
    const showAll = () => setActiveFilters([]);

    const visibleMarkers =
        activeFilters.length === 0
            ? markers
            : markers.filter((m) => activeFilters.includes(m.category));

    // Delete marker
    const handleDelete = (index) => {
        const updated = markers.filter((_, i) => i !== index);
        setMarkers(updated);
    };

    // Edit marker
    const startEditing = (index) => {
        setEditingIndex(index);
        setEditLabel(markers[index].label);
        setEditCategory(markers[index].category);
    };
    const saveEdit = (index) => {
        const updated = [...markers];
        updated[index].label = editLabel;
        updated[index].category = editCategory;
        setMarkers(updated);
        setEditingIndex(null);
    };
    const cancelEdit = () => setEditingIndex(null);

    // Export markers as JSON file
    const handleExport = () => {
        const blob = new Blob([JSON.stringify(markers, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "markers.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import markers from JSON file
    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    setMarkers(imported);
                } else {
                    alert("Invalid file format.");
                }
            } catch (err) {
                alert("Error reading file.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex flex-col items-center p-6 gap-4 w-full max-w-6xl">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                    onClick={showAll}
                    className={`px-3 py-1 rounded border ${
                        activeFilters.length === 0
                            ? "bg-gray-800 text-white"
                            : "bg-white hover:bg-gray-100"
                    }`}
                >
                    Show All
                </button>
                {Object.keys(categoryColors).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => toggleFilter(cat)}
                        className={`px-3 py-1 rounded border flex items-center gap-1 ${
                            activeFilters.includes(cat)
                                ? `${categoryColors[cat]} text-white`
                                : "bg-white hover:bg-gray-100"
                        }`}
                    >
            <span
                className={`inline-block w-2 h-2 rounded-full ${categoryColors[cat]}`}
            ></span>
                        {cat}
                    </button>
                ))}
            </div>
            <div className="columns-2 gap-4">
                {/* Video Player */}
                <video
                    ref={videoRef}
                    width="720"
                    controls
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    className="rounded-xl shadow-lg w-full"
                >
                    <source src="/sample-video.mp4" type="video/mp4"/>
                    Your browser does not support the video tag.
                </video>
                {/* Marker List */}
                <div className="w-full mt-4">
                    <h2 className="text-lg font-bold mb-2">Markers</h2>
                    {visibleMarkers.length === 0 && (
                        <p className="text-gray-500">No markers to show.</p>
                    )}
                    <ul className="space-y-2">
                        {markers.map((m, i) => {
                            const isVisible =
                                activeFilters.length === 0 ||
                                activeFilters.includes(m.category);
                            if (!isVisible) return null;

                            return (
                                <li
                                    key={i}
                                    className="flex justify-between items-center border p-2 rounded"
                                >
                                    {editingIndex === i ? (
                                        // Edit Mode
                                        <div className="flex flex-wrap gap-2 items-center w-full">
                                            <input
                                                type="text"
                                                value={editLabel}
                                                onChange={(e) => setEditLabel(e.target.value)}
                                                className="border rounded p-1 flex-1 min-w-[120px]"
                                            />
                                            <select
                                                value={editCategory}
                                                onChange={(e) => setEditCategory(e.target.value)}
                                                className="border rounded p-1"
                                            >
                                                {Object.keys(categoryColors).map((cat) => (
                                                    <option key={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => saveEdit(i)}
                                                className="bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="bg-gray-400 text-white rounded px-2 py-1 hover:bg-gray-500"
                                            >
                                                Cancel
                                            </button>
                                        </div>

                                    ) : (
                                        // View Mode
                                        <>
                                            <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {fancyTimeStamp(m.time)}
                      </span>
                                                <span
                                                    className={`inline-block w-3 h-3 rounded-full ${categoryColors[m.category]}`}
                                                ></span>
                                                <span className="font-medium">{m.label}</span>
                                                <span className="text-sm text-gray-500">
                      </span>
                                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {m.category}
                      </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleJump(m.time)}
                                                        className="bg-gray-600 text-white rounded px-2 py-1">
                                                    <HiCursorClick/>
                                                </button>
                                                <button onClick={() => startEditing(i)}
                                                        className="bg-gray-600 text-white rounded px-2 py-1">
                                                    <HiOutlinePencilAlt/>
                                                </button>
                                                <button onClick={() => handleDelete(i)}
                                                        className="bg-gray-600 text-white rounded px-2 py-1">
                                                    <HiOutlineTrash/>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* Timeline Bar */}
            <div className="relative w-full h-4 bg-gray-300 rounded-full mt-4">
                <div
                    className="absolute top-0 left-0 h-4 bg-blue-500 rounded-full"
                    style={{
                        width: duration ? `${(currentTime / duration) * 100}%` : "0%",
                        transition: "width 0.1s linear",
                    }}
                />
                {visibleMarkers.map((m, i) => (
                    <button
                        key={i}
                        className={`absolute top-0 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white hover:scale-125 transition ${categoryColors[m.category]}`}
                        style={{
                            left: duration ? `${(m.time / duration) * 100}%` : "0%",
                        }}
                        title={`${m.label} (${fancyTimeStamp(m.time)} – ${m.category}`}
                        onClick={() => handleJump(m.time)}
                    ></button>
                ))}
            </div>

            {/* Add Event Types */}
            <div className="flex flex-wrap items-center w-full columns-3 gap-4">
                <div className="flex items-center gap-2 bg-gray-300 rounded-2xl p-4">
                    <label>Player</label>
                    <input type="radio" name="event_type" checked />
                </div>
                <div className="flex items-center gap-2 bg-gray-300 rounded-2xl p-4">
                    <label>Event</label>
                    <input type="radio" name="event_type"/>
                </div>
                <div className="flex items-center gap-2 bg-gray-300 rounded-2xl p-4">
                    <label>Note</label>
                    <input type="radio" name="event_type"/>
                </div>
            </div>

            {/* Add Marker Controls */}
            <div className="flex flex-wrap flex-rows gap-2 items-center w-full">
                <select
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                    className="border rounded p-2"
                >
                    {Object.keys(players).map((player) => (
                        <option key={player}>{player}</option>
                    ))}
                </select>
                <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="border rounded p-2"
                >
                    {Object.keys(categoryColors).map((cat) => (
                        <option key={cat}>{cat}</option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Event label..."
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="border rounded p-2 flex-1 min-w-[100px]"
                />
                <button
                    onClick={handleAddMarker}
                    className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700"
                >
                    Add Event
                </button>
            </div>

            {/* Export/Import Buttons */}
            <div className="flex gap-2 mt-2">
                <button
                    onClick={handleExport}
                    className="bg-indigo-600 text-white rounded px-3 py-2 hover:bg-indigo-700"
                >
                    Export Markers
                </button>
                <button
                    onClick={() => fileInputRef.current.click()}
                    className="bg-gray-600 text-white rounded px-3 py-2 hover:bg-gray-700"
                >
                    Import Markers
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    onChange={handleImport}
                    className="hidden"
                />
            </div>
        </div>
    );
}
