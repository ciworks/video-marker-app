import React, {useEffect, useRef, useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {HiOutlineTrash, HiOutlinePencilAlt, HiCursorClick} from "react-icons/hi";


// ---------------------------
// IMPORTANT: set these in your .env (or environment)
// NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// ---------------------------
const supabase = createClient(
    "https://ptckztatwhvpjjtxlvyc.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Y2t6dGF0d2h2cGpqdHhsdnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDg1NjUsImV4cCI6MjA3NjcyNDU2NX0.bVCPhs6a5EJkidr_OKoFID4tHCQtqR0bgDW6ht9SLbY"
);

// Example Supabase table schema (SQL):
/*
CREATE TABLE annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, -- 'Player' | 'Event' | 'Note'
  time_seconds numeric NOT NULL,
  player_name text, -- optional: used when category = 'Player'
  action text, -- optional: used when category = 'Player'
  event_type text, -- optional: used when category = 'Event'
  note text, -- optional: used when category = 'Note' (max 255 chars)
  meta jsonb, -- any extra data
  created_at timestamptz DEFAULT now()
);
*/

// Utility: format seconds to mm:ss
function formatTime(seconds) {
    if (!seconds && seconds !== 0) return "0:00";
    const s = Math.floor(seconds % 60);
    const m = Math.floor(seconds / 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ReactVideoPlayerWithAnnotations({
                                                            videoSrc = "/sample-video.mp4",
                                                            videoPoster = "",
                                                            defaultCategory = "Player",
                                                            playerNames = ["Nina", "Olivia A.", "Ariane", "Olivia", "Amelle", "Pearl"],
                                                            playerActions = ["Bad Pass", "Contact", "Footwork", "Feed", "Goal", "Held Ball", "Intercept", "Miss", "Obstruction", "Pickup", "Lost Rebound", "Rebound", "Tip", "Opposition Error", "Handling Error", "General Error",],
                                                            eventTypes = ["Foul", "Injury", "Substitution", "Timeout"],
                                                        }) {
    // refs
    const videoRef = useRef(null);
    const timelineRef = useRef(null);

    // player state
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);

    // annotations state
    const [annotations, setAnnotations] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

    // form fields
    const [playerName, setPlayerName] = useState(playerNames[0]);
    const [playerAction, setPlayerAction] = useState(playerActions[0]);
    const [eventType, setEventType] = useState(eventTypes[0]);
    const [noteText, setNoteText] = useState("");

    // UI tooltip
    const [tooltip, setTooltip] = useState({open: false, x: 0, y: 0, content: null});

    const [filterType, setFilterType] = useState("All");
    const [categoryFilters, setCategoryFilters] = useState(["Player", "Event", "Note"]);

    // fetching annotations from Supabase
    useEffect(() => {
        fetchAnnotations();
    }, []);

    async function fetchAnnotations() {
        try {
            const {data, error} = await supabase
                .from("annotations")
                .select("*")
                .order("time_seconds", {ascending: true});
            if (error) throw error;
            setAnnotations(data || []);
        } catch (err) {
            console.error("Failed fetching annotations", err.message || err);
        }
    }

    async function handleDelete(id) {
        setAnnotations(prev => prev.filter(a => a.id !== id)); // optimistic remove

        const { error } = await supabase
            .from('annotations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Failed to delete annotation:', error);
            // Optionally roll back UI if needed
            fetchAnnotations();
        }
    }

    // video event handlers
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        function onLoadedMeta() {
            setDuration(video.duration || 0);
        }

        function onTimeUpdate() {
            setCurrentTime(video.currentTime || 0);
        }

        function onPlay() {
            setPlaying(true);
        }

        function onPause() {
            setPlaying(false);
        }

        video.addEventListener("loadedmetadata", onLoadedMeta);
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);

        return () => {
            video.removeEventListener("loadedmetadata", onLoadedMeta);
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
        };
    }, []);

    // controls
    function togglePlay() {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play();
        else video.pause();
    }

    function skip(seconds) {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
        setCurrentTime(video.currentTime);
    }

    function changeRate(rate) {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = rate;
        setPlaybackRate(rate);
    }

    function changeVolume(v) {
        const video = videoRef.current;
        if (!video) return;
        video.volume = v;
        setVolume(v);
    }

    function seekTo(clientX) {
        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const pct = x / rect.width;
        const t = pct * duration;
        const video = videoRef.current;
        if (video) video.currentTime = t;
        setCurrentTime(t);
    }

    // add annotation form submit -> persist to supabase
    async function handleAddAnnotation(e) {
        e.preventDefault();
        const time_seconds = currentTime;
        const payload = {
            category: selectedCategory,
            time_seconds,
            player_name: selectedCategory === "Player" ? playerName : null,
            action: selectedCategory === "Player" ? playerAction : null,
            event_type: selectedCategory === "Event" ? eventType : null,
            note: selectedCategory === "Note" ? noteText.slice(0, 255) : null,
        };

        try {
            const {data, error} = await supabase.from("annotations").insert(payload).select();
            if (error) throw error;
            // optimistic update: append returned row(s)
            setAnnotations((prev) => [...prev, ...data].sort((a, b) => a.time_seconds - b.time_seconds));
            // reset note input
            setNoteText("");
        } catch (err) {
            console.error("Failed saving annotation", err.message || err);
        }
    }

    // clicking on an annotation marker
    function onMarkerClick(ev, ann) {
        // position tooltip near click
        const rect = timelineRef.current.getBoundingClientRect();
        setTooltip({
            open: true,
            x: Math.min(rect.width - 200, ev.clientX - rect.left),
            y: -60,
            content: ann,
        });
    }

    function closeTooltip() {
        setTooltip({open: false, x: 0, y: 0, content: null});
    }

    // render marker left percent
    function leftPercentForTime(t) {
        if (!duration || duration === 0) return 0;
        return Math.min(100, Math.max(0, (t / duration) * 100));
    }

    const filteredAnnotations = annotations.filter((ann) => {
        // Category filter (multi-select)
        if (!categoryFilters.includes(ann.category)) return false;

        // Event type filter (single select)
        if (filterType !== "All" && ann.category === "Event" && ann.event_type !== filterType)
            return false;

        return true;
    });

    const eventCounts = eventTypes.reduce((acc, type) => {
        acc[type] = annotations.filter((a) => a.event_type === type).length;
        return acc;
    }, {});


    useEffect(() => {
        // Automatically set the eventType selection based on the filter
        if (filterType !== "All" && selectedCategory === "Event") {
            setEventType(filterType);
        }
    }, [filterType, selectedCategory]);

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-6">
            <div className="flex items-center gap-3 mb-3">
                <label className="font-medium text-sm">Show Categories:</label>
                {["Player", "Event", "Note"].map(cat => (
                    <label key={cat} className="flex items-center gap-1">
                        <input
                            type="checkbox"
                            checked={categoryFilters.includes(cat)}
                            onChange={() => {
                                setCategoryFilters(prev =>
                                    prev.includes(cat)
                                        ? prev.filter(c => c !== cat)
                                        : [...prev, cat]
                                );
                            }}
                        />
                        {cat}
                    </label>
                ))}
            </div>
            <div className="flex items-center gap-3 mb-2">
                <label className="text-sm font-medium">Filter Events:</label>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border rounded px-2 py-1"
                >
                    <option value="All">All</option>
                    {eventTypes.map((et) => (
                        <option key={et} value={et}>
                            {et} ({eventCounts[et] || 0})
                        </option>
                    ))}
                </select>
            </div>
            <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                <div className="relative">
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        poster={videoPoster}
                        className="w-full h-auto bg-black"
                        preload="metadata"
                    />

                    {/* simple overlay play button when paused */}
                    {!playing && (
                        <button
                            onClick={togglePlay}
                            className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl"
                            aria-label="Play"
                        >
                            ▶
                        </button>
                    )}
                </div>

                {/* custom controls */}
                <div className="p-3 bg-gray-800 text-white">
                    <div className="flex items-center gap-3">
                        <button onClick={() => skip(-10)} className="px-3 py-1 rounded bg-gray-700">
                            -10s
                        </button>
                        <button onClick={togglePlay} className="px-4 py-1 rounded bg-indigo-600">
                            {playing ? "Pause" : "Play"}
                        </button>
                        <button onClick={() => skip(10)} className="px-3 py-1 rounded bg-gray-700">
                            +10s
                        </button>

                        <div className="flex items-center gap-2 ml-4">
                            <label className="text-sm">Speed</label>
                            <select
                                value={playbackRate}
                                onChange={(e) => changeRate(Number(e.target.value))}
                                className="rounded bg-gray-700 text-white px-2 py-1"
                            >
                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                                    <option key={r} value={r}>
                                        {r}x
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <label className="text-sm">Volume</label>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onChange={(e) => changeVolume(Number(e.target.value))}
                                className="w-32"
                            />
                        </div>
                    </div>

                    {/* timeline with markers */}
                    <div
                        ref={timelineRef}
                        className="relative h-4 bg-gray-700 mt-4 rounded cursor-pointer"
                        onClick={(e) => seekTo(e.clientX)}
                    >
                        {/* progress fill */}
                        <div
                            className="absolute left-0 top-0 bottom-0 bg-indigo-500 rounded"
                            style={{width: `${(currentTime / (duration || 1)) * 100}%`}}
                        />

                        {/* markers */}
                        {filteredAnnotations.map((ann) => (
                            <div
                                key={ann.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkerClick(e, ann);
                                }}
                                title={`${ann.category} @ ${formatTime(Number(ann.time_seconds))}`}
                                className={`absolute top-0 h-full w-1 rounded ${ann.category === "Player" ? "bg-green-400" : ann.category === "Event" ? "bg-yellow-400" : "bg-pink-400"}`}
                                style={{
                                    left: `${leftPercentForTime(Number(ann.time_seconds))}%`,
                                    transform: "translateX(-50%)"
                                }}
                            />
                        ))}

                        {/* current time thumb */}
                        <div
                            className="absolute top-0 h-full w-1 bg-white rounded"
                            style={{left: `${leftPercentForTime(currentTime)}%`, transform: "translateX(-50%)"}}
                        />

                        {/* tooltip overlay (simple) */}
                        {tooltip.open && tooltip.content && (
                            <div
                                style={{left: tooltip.x, top: tooltip.y}}
                                className="absolute -top-14 w-48 p-2 rounded bg-black text-white text-xs shadow-lg"
                                onMouseLeave={closeTooltip}
                            >
                                <div className="font-semibold">{tooltip.content.category}</div>
                                <div className="text-xs">Time: {formatTime(Number(tooltip.content.time_seconds))}</div>
                                {tooltip.content.category === "Player" && (
                                    <div
                                        className="text-xs">{tooltip.content.player_name} — {tooltip.content.action}</div>
                                )}
                                {tooltip.content.category === "Event" && (
                                    <div className="text-xs">Type: {tooltip.content.event_type}</div>
                                )}
                                {tooltip.content.category === "Note" && (
                                    <div className="text-xs">Note: {tooltip.content.note}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* time display */}
                    <div className="text-sm mt-2 text-gray-300">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                </div>
            </div>

            {/* annotation form */}
            <form onSubmit={handleAddAnnotation} className="p-4 bg-white rounded shadow space-y-3">
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="category"
                            value="Player"
                            checked={selectedCategory === "Player"}
                            onChange={() => setSelectedCategory("Player")}
                        />
                        Player
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="category"
                            value="Event"
                            checked={selectedCategory === "Event"}
                            onChange={() => setSelectedCategory("Event")}
                        />
                        Event
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="category"
                            value="Note"
                            checked={selectedCategory === "Note"}
                            onChange={() => setSelectedCategory("Note")}
                        />
                        Note
                    </label>

                    <div className="ml-auto text-sm text-gray-600">Annotation time: {formatTime(currentTime)}</div>
                </div>

                {/* conditional fields */}
                {selectedCategory === "Player" && (
                    <div className="flex gap-2">
                        <select value={playerName} onChange={(e) => setPlayerName(e.target.value)}
                                className="flex-1 px-2 py-1 border rounded">
                            {playerNames.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                        <select value={playerAction} onChange={(e) => setPlayerAction(e.target.value)}
                                className="flex-1 px-2 py-1 border rounded">
                            {playerActions.map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {selectedCategory === "Event" && (
                    <div>
                        <select value={eventType} onChange={(e) => setEventType(e.target.value)}
                                className="w-full px-2 py-1 border rounded">
                            {eventTypes.map((et) => (
                                <option key={et} value={et}>
                                    {et}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {selectedCategory === "Note" && (
                    <div>
                        <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            maxLength={255}
                            placeholder="Add a note (max 255 chars)"
                            className="w-full px-2 py-1 border rounded"
                        />
                    </div>
                )}

                <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">
                        Save Annotation
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            // create annotation at current time from the player action quick menu
                            skip(0);
                        }}
                        className="px-4 py-2 bg-gray-200 rounded"
                    >
                        Set at current time
                    </button>
                </div>
            </form>

            {/* annotations list - quick access */}
            <div className="p-4 bg-white rounded shadow">
                <h3 className="font-semibold mb-2">Annotations</h3>
                <div className="space-y-1 text-sm text-gray-700">
                    {filteredAnnotations.length === 0 && <div className="text-gray-400">No annotations yet</div>}
                    {filteredAnnotations.map((a) => (
                        <div key={a.id} className="flex items-center gap-3">
                            <div className="w-20 text-xs text-gray-500">{formatTime(Number(a.time_seconds))}</div>
                            <div className="flex-1">
                                <div className="text-sm font-medium">{a.category}</div>
                                <div className="text-xs text-gray-500">
                                    {a.category === "Player" ? `${a.player_name} — ${a.action}` : a.category === "Event" ? `Type: ${a.event_type}` : a.note}
                                </div>
                            </div>
                            <div className="flex flex-cols rows-2 gap-2">
                                <button
                                    onClick={() => {
                                        // seek to annotation
                                        const video = videoRef.current;
                                        if (video) video.currentTime = Number(a.time_seconds);
                                        setCurrentTime(Number(a.time_seconds));
                                    }}
                                    className="px-2 py-1 text-xs bg-gray-100 rounded"
                                >
                                    <HiCursorClick />
                                </button>
                                <button
                                    onClick={() => handleDelete(a.id)}
                                    className="px-2 py-1 text-xs bg-gray-100 rounded"
                                >
                                    <HiOutlineTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
