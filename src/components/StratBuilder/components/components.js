import React, { useState, useCallback, useRef } from "react";
import styled, { keyframes } from "styled-components";
import ReactSelect from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { StyledInput, StyledInputLabel, HoverSelect } from "./styled";

export const AddThingBtn = ({ disabled, onClick, name }) => (
    <Button disabled={disabled} onClick={onClick}>
        {name}
    </Button>
);

const Button = styled.button``;

export const StratListContainer = styled.div`
    border: 1px solid red;
    display: inline-block;
`;

export const Title = ({ title }) => <TitleContainer>{title}</TitleContainer>;
const TitleContainer = styled.h1`
    display: flex;
    justify-content: center;
`;

export const Container = styled.div`
    color: white;
    padding: 2em;
`;

export const LoadingButton = ({ disabled = false, loading, submit, name }) => {
    if (loading)
        name = (
            <>
                {" "}
                <FontAwesomeIcon icon={faSpinner} spin />
                Loading...
            </>
        );
    return (
        <AddThingBtn
            disabled={loading ? true : disabled}
            // style={{ width: "inherit" }}
            className="btn"
            onClick={submit}
            name={name}
        />
    );
};

export const ButtonWithLongPress = ({ onClick, title, borderColor, rIcon }) => {
    const clickIntervalRef = useRef(null);
    const checkIntervalRef = useRef(null);
    const startTimeRef = useRef(null);

    const normalSpeed = 150; // Normal interval speed in ms
    const fastSpeed = 75; // Fast interval speed (2x)
    const turboSpeed = 30; // Turbo interval speed (5x)

    const firstDuration = 1500; // 2 seconds
    const secondDuration = 3500; // 5 seconds

    const startIncrement = useCallback(() => {
        if (clickIntervalRef.current) return;

        startTimeRef.current = Date.now();
        onClick();

        // Start with normal speed clicks
        clickIntervalRef.current = setInterval(onClick, normalSpeed);

        // Start a separate interval to check duration and adjust speed
        checkIntervalRef.current = setInterval(() => {
            const holdDuration = Date.now() - startTimeRef.current;

            // Switch to turbo speed after 5 seconds
            if (holdDuration >= secondDuration) {
                clearInterval(clickIntervalRef.current);
                clickIntervalRef.current = setInterval(onClick, turboSpeed);
                clearInterval(checkIntervalRef.current); // Stop checking once we reach max speed
            }
            // Switch to fast speed after 2 seconds
            else if (holdDuration >= firstDuration) {
                clearInterval(clickIntervalRef.current);
                clickIntervalRef.current = setInterval(onClick, fastSpeed);
            }
        }, 100); // Check every 100ms
    }, [onClick]);

    const stopIncrement = useCallback(() => {
        if (clickIntervalRef.current) {
            clearInterval(clickIntervalRef.current);
            clickIntervalRef.current = null;
        }
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        startTimeRef.current = null;
    }, []);

    return <IconButton borderColor={borderColor} title={title} onMouseDown={startIncrement} onMouseUp={stopIncrement} onMouseLeave={stopIncrement} onTouchStart={startIncrement} onTouchEnd={stopIncrement} rIcon={rIcon} />;
};

export const IconButton = (props) => {
    const { borderColor, onClick, icon, index, title, color, bgColor, rIcon, text, onContextMenu = () => {} } = props;
    return (
        <HoverIcon onContextMenu={onContextMenu} title={title} onClick={onClick} index={index} color={color} bgColor={bgColor} borderColor={borderColor} {...props}>
            {icon && <FontAwesomeIcon icon={icon} />}
            {rIcon && rIcon}
            {text && text}
        </HoverIcon>
    );
};

const springAnimation = keyframes`
 0% {  transform :scale(1);
     }
 50% {  transform :scale(1.1);
     }
 100% {  transform :scale(1) ;
    }
`;

const HoverIcon = styled.div`
    padding: 0.5em;
    color: ${({ color }) => (color ? color : "inherit")};
    background-color: ${({ index, bgColor }) => {
        if (bgColor) return bgColor;
        else if (index % 2) {
            return "#333";
        } else {
            return "#444";
        }
    }};
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    /* width: auto; */
    margin: 0 auto;
    transition: all 0.3s;
    border-radius: 10px;
    cursor: pointer;
    display: inline;
    border: ${({ borderColor }) => (borderColor ? `1px solid ${borderColor}` : `1px solid ${"rgba(50,50,50,0.5)"}`)};
    user-select: none;
    /* animation-iteration-count: infinite; */
    &:hover {
        animation-name: ${springAnimation};
        animation-duration: 0.3s;
        background-color: ${({ index, bgColor }) => {
            if (bgColor) return bgColor;
            else if (index % 2) {
                return "#555";
            } else {
                return "#222";
            }
        }};
        box-shadow: ${({ index, bgColor }) => {
            if (bgColor) return bgColor;
            else if (index % 2) {
                return "0 0 0 2px #222";
            } else {
                return "0 0 0 2px #555";
            }
        }};
    }
`;

export const Input = ({ min, onChange, label, value, disabled, type = "text" }) => {
    return (
        <div style={{ maxWidth: "4em", display: "flex", alignItems: "center" }}>
            <StyledInputLabel htmlFor="">{label}</StyledInputLabel>
            <StyledInput min={min ? min : "-999999999"} type={type} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
};

const SelectStyles = {
    menu: (styles) => ({
        background: "black",
        border: "1px solid #777",
        position: "absolute",
        width: "100%",
        textAlign: "center",
    }),
    indicatorSeparator: () => ({ display: "none" }),
    control: (styles) => ({
        ...styles,
        backgroundColor: "black",
        minWidth: "70px",
    }),
    option: (styles, { data, isDisabled, isFocused, isSelected }) => {
        return {
            ...styles,
            backgroundColor: isDisabled ? null : isSelected ? "#666" : isFocused ? "#222" : null,
            color: "white",
            cursor: isDisabled ? "not-allowed" : "default",
            borderBottom: `1px solid ${isSelected ? "goldenRod" : "white"}`,
        };
    },
    input: (styles) => ({ color: "red" }),
    //   placeholder: (styles) => ({ ...styles, ...dot() }),
    singleValue: (styles, { data }) => {
        return { ...styles, color: "white" };
    },
    valueContainer: (styles, { data }) => {
        return { ...styles, color: "white" };
    },
};
export const Select = ({ options, setValue, value }) => {
    return (
        <div>
            <ReactSelect styles={SelectStyles} options={options} onChange={setValue} value={value} />
        </div>
    );
};
