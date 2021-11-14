import React from "react";
import { Small } from "./styled";
import { MA_SELECT, LineColors, MA_TYPE_OPTS } from "../IndicatorComponents";
export default function EditableIndOpts({
    data,
    setEdit,
    values,
    setValues,
    edit,
}) {
    return (
        <>
            {Object.keys(data).map((name) => {
                let { hint, displayName, defaultValue } = data[name];

                return (
                    <Small
                        onClick={() => setEdit(true)}
                        key={name}
                        title={hint}
                    >
                        {displayName}
                        {" : "}
                        {edit && displayName !== "MA Type" && (
                            <input
                                type={"number"}
                                style={{}}
                                value={values[name].defaultValue}
                                onChange={(e) => {
                                    values[name].defaultValue = e.target.value;
                                    setValues({
                                        ...values,
                                    });
                                }}
                            />
                        )}
                        {edit && displayName === "MA Type" && (
                            <MA_SELECT
                                name={name}
                                indicatorOpts={values}
                                setIndicatorOpts={setValues}
                            />
                        )}

                        {!edit &&
                            displayName === "MA Type" &&
                            MA_TYPE_OPTS[defaultValue]}
                        {!edit && displayName !== "MA Type" && defaultValue}
                    </Small>
                );
            })}
        </>
    );
}
