import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

export default function PlantStatuses(props = {}) {
    const { Socket } = props;
    const timerRef = useRef();
    const [plantStatus, setPlantStatus] = useState({});

    useEffect(() => {
        Socket.on("PlantStatus", (d) => {
            setPlantStatus((plantStatus) => ({
                ...plantStatus,
                [d.name]: true,
            }));
        });
        return () => {
            Socket.off("PlantStatus");

            clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setPlantStatus({});
        }, 30000);
    }, [plantStatus]);

    return (
        <div className="row ">
            <div className="col">
                <PlantIndicator active={plantStatus["BackTesterPlant"]} title={"BackTesterPlant"}></PlantIndicator>
            </div>
            {/* <div className="col">
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
            </div> */}
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
