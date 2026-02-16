import React from "react";
import { PlayCircleIcon } from "lucide-react";

const TrailerBanner = ({ trailer }) => {
  return (
    <div
      className="mx-auto max-w-full relative cursor-pointer"
      style={{ width: "960px", height: "540px" }}
      onClick={() => window.open(trailer.videoUrl, "_blank")}
    >
      <img
        src={trailer.image}
        alt="trailer banner"
        className="w-full h-full object-cover rounded-lg brightness-75"
      />

      <PlayCircleIcon
        strokeWidth={1.6}
        className="absolute top-1/2 left-1/2 w-16 h-16 text-white transform -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
};

export default TrailerBanner;
