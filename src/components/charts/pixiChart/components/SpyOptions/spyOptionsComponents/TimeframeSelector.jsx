import { useState } from "react";
import styled from "styled-components";

const ButtonGroup = styled.div`
    display: flex;
    gap: 4px;
    padding: 8px;
    background-color: #f3f4f6;
    border-radius: 8px;
    width: fit-content;
`;

const TimeframeButton = styled.button`
    padding: 4px 12px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;

    ${(props) =>
        props.active
            ? `
    background-color: #3b82f6;
    color: white;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  `
            : `
    background-color: white;
    color: #374151;
    border: 1px solid #e5e7eb;
    
    &:hover {
      background-color: #f9fafb;
    }
  `}
`;

export default function TimeframeSelector({ timeframe, setTimeframe }) {
    // const [timeframe, setTimeframe] = useState("spy1MinData");

    const timeframes = [
        { value: "spy1MinData", label: "1M" },
        { value: "spy5MinData", label: "5M" },
        { value: "spy30MinData", label: "30M" },
        { value: "spy60MinData", label: "1H" },
        { value: "spyDailyData", label: "1D" },
        { value: "spyWeeklyData", label: "1W" },
    ];

    return (
        <ButtonGroup>
            {timeframes.map((tf) => (
                <TimeframeButton key={tf.value} active={timeframe === tf.value} onClick={() => setTimeframe(tf.value)}>
                    {tf.label}
                </TimeframeButton>
            ))}
        </ButtonGroup>
    );
}
