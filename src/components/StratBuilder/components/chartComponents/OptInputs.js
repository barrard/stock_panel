import React, { useState, useContext } from "react";
import StratContext from "../../StratContext";
import EditableIndOpts from "./EditableIndOpts";
import { Small } from "./styled";
import { IconButton, LoadingButton } from "../components";
import {
    faEye,
    faPlusSquare,
    faTrashAlt,
    faPencilAlt,
    faEyeSlash,
    faWindowClose,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";

export default function OptInputs({
    edit,
    ind,
    setEdit,
    fetchAndUpdateIndicatorResults,
}) {
    let data = ind.optInputs;
    const [values, setValues] = useState(data);
    let { updatingIndicator, setUpdatingIndicator, API } =
        useContext(StratContext);

    return (
        <>
            <EditableIndOpts
                data={data}
                setEdit={setEdit}
                values={values}
                setValues={setValues}
                edit={edit}
            />
            {edit && (
                <Small>
                    <IconButton
                        title={"Cancel"}
                        onClick={() => setEdit(false)}
                        icon={faTimes}
                    />
                    <LoadingButton
                        disabled={updatingIndicator}
                        loading={updatingIndicator}
                        name="Update Indicator"
                        submit={async () => {
                            setUpdatingIndicator(true);
                            console.log("UPDATE");
                            let resp = await API.updateIndicatorOpts({
                                ...values,
                                _id: ind._id,
                            });
                            if (!resp.indicator) {
                                return console.error("ERR");
                            }
                            await fetchAndUpdateIndicatorResults(
                                resp.indicator
                            );

                            setUpdatingIndicator(false);
                            setEdit(false);
                        }}
                    />
                </Small>
            )}
        </>
    );
}
