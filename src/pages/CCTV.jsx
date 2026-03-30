import { useRef, useState, useEffect, useCallback } from "react";
import { VIDEO_SOURCES } from "../constants/videoSources";
import "./CCTV.css";

const CCTV = () => {
  const videoRefs = useRef({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState(new Set());
  const [visibleVideos, setVisibleVideos] = useState(new Set());
  const masterTimeRef = useRef(0);
  const containerRefs = useRef({});

  // Register video ref
  const setVideoRef = useCallback((id, el) => {
    if (el) {
      videoRefs.current[id] = el;
    } else {
      delete videoRefs.current[id];
    }
  }, []);

  // Register container ref
  const setContainerRef = useCallback((id, el) => {
    if (el) {
      containerRefs.current[id] = el;
    }
  }, []);

  // Setup Intersection Observer
  useEffect(() => {
    const observers = {};

    VIDEO_SOURCES.forEach((camera) => {
      const container = containerRefs.current[camera.id];
      if (!container) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setVisibleVideos((prev) => {
            const updated = new Set(prev);
            if (entry.isIntersecting) {
              updated.add(camera.id);
            } else {
              updated.delete(camera.id);
            }
            return updated;
          });
        },
        { threshold: 0.1, rootMargin: "100px" },
      );

      observer.observe(container);
      observers[camera.id] = observer;
    });

    return () => {
      Object.values(observers).forEach((obs) => obs.disconnect());
    };
  }, []);

  // Handle visibility changes - play/pause based on visibility
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (!video) return;
      const numId = parseInt(id);

      if (isPlaying && visibleVideos.has(numId) && loadedVideos.has(numId)) {
        // Sync to master time and play
        video.currentTime = masterTimeRef.current;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [isPlaying, visibleVideos, loadedVideos]);

  // Sync master time periodically
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Get time from first playing video
      const playingVideo = Object.values(videoRefs.current).find(
        (v) => v && !v.paused,
      );
      if (playingVideo) {
        masterTimeRef.current = playingVideo.currentTime;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleVideoLoaded = (id) => {
    setLoadedVideos((prev) => new Set([...prev, id]));
  };

  const handlePlayAll = () => {
    masterTimeRef.current = 0; // Start from beginning

    // Set all videos to start and play visible ones
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (!video) return;
      video.currentTime = 0;

      if (visibleVideos.has(parseInt(id))) {
        video.play().catch(() => {});
      }
    });

    setIsPlaying(true);
  };

  const handlePauseAll = () => {
    // Save current time
    const playingVideo = Object.values(videoRefs.current).find(
      (v) => v && !v.paused,
    );
    if (playingVideo) {
      masterTimeRef.current = playingVideo.currentTime;
    }

    // Pause all
    Object.values(videoRefs.current).forEach((video) => {
      if (video) video.pause();
    });

    setIsPlaying(false);
  };

  const allVisibleLoaded = [...visibleVideos].every((id) =>
    loadedVideos.has(id),
  );

  return (
    <div className="cctv-container">
      <div className="cctv-header">
        <h2>CCTV Monitoring</h2>
        <div className="load-status">
          <span className="visible-count">
            {visibleVideos.size} cameras in view | {loadedVideos.size} loaded
          </span>
        </div>
      </div>

      <div className="video-grid">
        {VIDEO_SOURCES.map((camera) => (
          <div
            key={camera.id}
            ref={(el) => setContainerRef(camera.id, el)}
            className="video-cell"
          >
            <div className="video-label">
              {camera.name}
              {visibleVideos.has(camera.id) && loadedVideos.has(camera.id) && (
                <span className="visibility-dot"></span>
              )}
            </div>

            <video
              ref={(el) => setVideoRef(camera.id, el)}
              src={camera.src}
              onLoadedData={() => handleVideoLoaded(camera.id)}
              muted
              loop
              playsInline
              preload={visibleVideos.has(camera.id) ? "auto" : "metadata"}
            />

            {!loadedVideos.has(camera.id) && (
              <div className="video-loading">
                <div className="spinner"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="controls-bar">
        <button
          className={`control-button play-button ${isPlaying ? "" : "active"}`}
          onClick={handlePlayAll}
          disabled={isPlaying || !allVisibleLoaded}
        >
          <span className="control-icon">▶</span>
          Play All
        </button>
        <button
          className={`control-button pause-button ${isPlaying ? "active" : ""}`}
          onClick={handlePauseAll}
          disabled={!isPlaying}
        >
          <span className="control-icon">⏸</span>
          Pause All
        </button>
      </div>
    </div>
  );
};

export default CCTV;
