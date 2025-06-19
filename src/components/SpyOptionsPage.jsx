import React from "react";
import SpyOptions from "./charts/pixiChart/components/SpyOptions";
export default function SpyOptionsPage({ Socket }) {
    return <SpyOptions Socket={Socket} />;
}
