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
    // MongoDB shell version v5.0.28
    // sudo apt-get install -y mongodb-org=5.0.28 mongodb-org-database=5.0.28 mongodb-org-server=5.0.28 mongodb-mongosh=5.0.28 mongodb-org-mongos=5.0.28 mongodb-org-tools=5.0.28
    // curl -fsSL https://www.mongodb.org/static/pgp/server-5.0.asc | \
    // sudo gpg -o /usr/share/keyrings/mongodb-server-5.0.gpg \
    // --dearmor
    // echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-5.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
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
