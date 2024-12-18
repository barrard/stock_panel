import React from "react";

export default function Input(props) {
    const { label, value, setValue, disabled, type, min = -9999000000, max = 999999999999, step = 1, onKeyDown = () => {} } = props;

    const handleChange = (e) => {
        const newValue = e.target.value;

        // If it's a number input, validate the range
        if (type === "number") {
            const numValue = parseFloat(newValue);
            if (newValue === "" || isNaN(numValue)) {
                setValue(newValue);
                return;
            }

            // Ensure the value is within min-max range
            if (numValue >= min && numValue <= max) {
                setValue(newValue);
            }
        } else {
            // For non-number inputs, just update the value
            setValue(newValue);
        }
    };

    return (
        <div className="">
            {!!label && (
                <div className="col-12">
                    <label htmlFor={label}>{label}</label>
                </div>
            )}

            <div className="col-12">
                <input min={type === "number" ? min : undefined} max={type === "number" ? max : undefined} step={type === "number" ? step : undefined} disabled={disabled} type={type} value={value} onChange={handleChange} className="form-control" onKeyDown={onKeyDown} />
            </div>
        </div>
    );
}
