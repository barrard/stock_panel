import React, { useEffect, useRef } from "react";
import styled from "styled-components";

export default function PlantStatuses(props = {}) {
    const { plantStatus, setPlantStatus } = props;
    const timerRef = useRef();

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setPlantStatus({});
        }, 50000);
    }, [plantStatus]);

    return (
        <Container>
            <PlantIndicator active={plantStatus["MarketDataPlant"]} title={"MarketDataPlant"}></PlantIndicator>
            <PlantIndicator active={plantStatus["PnL_Plant"]} title={"PnL_Plant"}></PlantIndicator>
            <PlantIndicator active={plantStatus["HistoryPlant"]} title={"HistoryPlant"}></PlantIndicator>
            <PlantIndicator active={plantStatus["OrderPlant"]} title={"OrderPlant"}></PlantIndicator>
        </Container>
    );
}

const Container = styled.div`
    display: flex;
    top: -1em;
    position: absolute;
`;

const PlantIndicator = styled.div`
    border-radius: 50%;
    margin-left: 5px;
    width: 10px;
    height: 10px;
    background: ${({ active }) => (active ? "green" : "red")};
    font-size: 10px;
`;
