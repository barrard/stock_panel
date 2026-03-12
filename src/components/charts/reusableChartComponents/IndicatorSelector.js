import React from "react";

const IndicatorSelector = ({ indicators, toggleIndicator }) => {
    return (
        <div style={{ display: "block", marginBottom: "8px" }}>
            {indicators.map((indicator) => (
                <button
                    key={indicator.id}
                    onClick={() => toggleIndicator(indicator.id)}
                    style={{
                        backgroundColor: indicator.enabled ? "#4CAF50" : "#f44336",
                        color: "white",
                        padding: "4px 8px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                        marginRight: "6px",
                        marginBottom: "6px",
                    }}
                >
                    {indicator.name}
                </button>
            ))}
        </div>
    );
};

export default IndicatorSelector;
