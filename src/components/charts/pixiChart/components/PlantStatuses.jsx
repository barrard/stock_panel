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
        <div className="row ">
            <div className="col">
                <PlantIndicator
                    active={plantStatus["MarketDataPlant"]}
                    title={"MarketDataPlant"}
                ></PlantIndicator>
            </div>
            <div className="col">
                <PlantIndicator
                    active={plantStatus["PnL_Plant"]}
                    title={"PnL_Plant"}
                ></PlantIndicator>
            </div>
            <div className="col">
                <PlantIndicator
                    active={plantStatus["HistoryPlant"]}
                    title={"HistoryPlant"}
                ></PlantIndicator>
            </div>
            <div className="col">
                <PlantIndicator
                    active={plantStatus["OrderPlant"]}
                    title={"OrderPlant"}
                ></PlantIndicator>
            </div>
        </div>
    );
}

const PlantIndicator = styled.div`
    border-radius: 50%;
    width: 10px;
    height: 10px;
    background: ${({ active }) => (active ? "green" : "red")};
    font-size: 10px;
`;
