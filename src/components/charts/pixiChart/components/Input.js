import React from "react";

export default function Input(props) {
    const {
        label,
        value,
        setValue,
        disabled,
        type,
        step = 1,
        onKeyDown = () => {},
    } = props;
    return (
        <div className="row border">
            <div className="col-12">
                <label htmlFor={label}>{label}</label>
            </div>

            <div className="col-12">
                <input
                    step={step}
                    disabled={disabled}
                    type={type}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="form-control"
                    onKeyDown={onKeyDown}
                />
            </div>
        </div>
    );
}
