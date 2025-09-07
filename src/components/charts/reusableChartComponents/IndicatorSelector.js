import React from "react";

const IndicatorSelector = ({ indicators, toggleIndicator }) => {
    return (
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            {indicators.map((indicator) => (
                <button
                    key={indicator.id}
                    onClick={() => toggleIndicator(indicator.id)}
                    style={{
                        backgroundColor: indicator.enabled ? "#4CAF50" : "#f44336",
                        color: "white",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    {indicator.name}
                </button>
            ))}
        </div>
    );
};

export default IndicatorSelector;
