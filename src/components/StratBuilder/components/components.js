import React, { useState } from "react";
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

export const IconButton = ({
    borderColor,
    onClick,
    icon,
    index,
    title,
    color,
    bgColor,
    rIcon,
}) => {
    return (
        <HoverIcon
            title={title}
            onClick={onClick}
            index={index}
            color={color}
            bgColor={bgColor}
            borderColor={borderColor}
        >
            {icon && <FontAwesomeIcon icon={icon} />}
            {rIcon && rIcon}
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
    transition: all 0.3s;
    border-radius: 10px;
    cursor: pointer;
    display: inline;
    border: ${({ borderColor }) =>
        borderColor ? `1px solid ${borderColor}` : "none"};

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

export const Input = ({
    min,
    onChange,
    label,
    value,
    disabled,
    type = "text",
}) => {
    return (
        <div style={{ maxWidth: "4em", display: "flex", alignItems: "center" }}>
            <StyledInputLabel htmlFor="">{label}</StyledInputLabel>
            <StyledInput
                min={min ? min : "-999999999"}
                type={type}
                disabled={disabled}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
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
            backgroundColor: isDisabled
                ? null
                : isSelected
                ? "#666"
                : isFocused
                ? "#222"
                : null,
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
            <ReactSelect
                styles={SelectStyles}
                options={options}
                onChange={setValue}
                value={value}
            />
        </div>
    );
};
