import React, { useState } from "react";
import styled from "styled-components";

const ToggleContainer = styled.div`
    display: inline-flex;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background-color: white;
    padding: 4px;
    width: fit-content;
`;

const ToggleButton = styled.button`
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: ${(props) => (props.isActive ? (props.variant === "calls" ? "#10b981" : "#ef4444") : "transparent")};
    color: ${(props) => (props.isActive ? "white" : "#374151")};
    box-shadow: ${(props) => (props.isActive ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none")};

    &:hover {
        background-color: ${(props) => (props.isActive ? (props.variant === "calls" ? "#059669" : "#dc2626") : "#f3f4f6")};
    }
`;

function CallsPutsToggle(props) {
    // const [callsOrPuts, setCallsOrPuts] = useState("CALLS");
    const { callsOrPuts, setCallsOrPuts } = props;

    return (
        <ToggleContainer>
            <ToggleButton variant="calls" isActive={callsOrPuts === "CALLS"} onClick={() => setCallsOrPuts("CALLS")}>
                CALLS
            </ToggleButton>
            <ToggleButton variant="puts" isActive={callsOrPuts === "PUTS"} onClick={() => setCallsOrPuts("PUTS")}>
                PUTS
            </ToggleButton>
        </ToggleContainer>
    );
}

export default CallsPutsToggle;
