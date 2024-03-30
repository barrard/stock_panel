import React from "react";

function makeOptions(options) {
    return options.map((o) => {
        return (
            <option key={o.value} value={o.value}>
                {o.name}
            </option>
        );
    });
}
export default function Select(props) {
    const { value, setValue, options, label, disabled = false } = props;

    return (
        <div className="row g-">
            <div className="col-12">
                <label htmlFor="symbol">{label}</label>
            </div>
            <div className="col-12">
                <select
                    disabled={disabled}
                    onChange={(e) => {
                        const value = options.find((o) => o.value == e.target.value);
                        setValue(value);
                    }}
                    className="form-control"
                    value={value.value}
                >
                    {makeOptions(options)}
                </select>
            </div>
        </div>
    );
}
