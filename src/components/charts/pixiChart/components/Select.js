import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";

const SelectContainer = styled.div`
    font-family: Arial, sans-serif;
    width: 100%;
    color: #333;
`;

const Label = styled.label`
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
`;

const InputWrapper = styled.div`
    position: relative;
`;

const Input = styled.input`
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    cursor: ${(props) => (props.isOpen ? "text" : "pointer")};
    background-color: ${(props) => (props.isOpen ? "white" : "#f8f9fa")};
    appearance: ${(props) => (props.isOpen ? "none" : "menulist-button")};
`;

const OptionsList = styled.ul`
    position: absolute;
    width: 100%;
    max-height: calc(100vh - 250px);
    overflow-y: auto;
    border: 1px solid #ccc;
    border-top: none;
    border-radius: 0 0 4px 4px;
    background-color: white;
    list-style-type: none;
    padding: 0;
    margin: 0;
    z-index: 1;
`;

export default function Select(props) {
    const { value, setValue, options, label, disabled = false } = props;
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredOptions, setFilteredOptions] = useState(options);
    const [selectedOption, setSelectedOption] = useState(value);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        setFilteredOptions(
            options.filter((option) => (typeof option.name === "string" ? option.name.toLowerCase().includes(searchTerm?.toLowerCase()) : true))
        );
    }, [searchTerm, options]);

    useEffect(() => {
        setSearchTerm(value.name);
        setSelectedOption(value);
    }, [value]);

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
    };

    const handleOptionClick = (option) => {
        setValue(option);
        setIsOpen(false);
    };

    const handleInputClick = () => {
        if (!isOpen) {
            setIsOpen(true);
            inputRef.current.select();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const currentIndex = filteredOptions.findIndex((o) => o.value === selectedOption.value);
            const nextIndex =
                e.key === "ArrowDown" ? (currentIndex + 1) % filteredOptions.length : (currentIndex - 1 + filteredOptions.length) % filteredOptions.length;
            setSelectedOption(filteredOptions[nextIndex]);
        } else if (e.key === "Enter") {
            if (selectedOption) {
                setValue(selectedOption);
            }
            setIsOpen(false);
        } else if (e.key === "Escape") {
            setSelectedOption(value);
            setIsOpen(false);
        }
    };

    return (
        <SelectContainer className="row g-">
            <div className="col-12">
                <Label htmlFor={`select-${label}`}>{label}</Label>
            </div>
            <div className="col-12">
                <InputWrapper>
                    <Input
                        ref={inputRef}
                        id={`select-${label}`}
                        type="text"
                        value={searchTerm}
                        onChange={handleInputChange}
                        onClick={handleInputClick}
                        onFocus={() => setIsOpen(true)}
                        onBlur={() =>
                            setTimeout(() => {
                                setIsOpen(false);
                                setSelectedOption(value);
                            }, 200)
                        }
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="form-control"
                        aria-haspopup="listbox"
                        aria-expanded={isOpen}
                        aria-autocomplete="list"
                        isOpen={isOpen}
                        readOnly={!isOpen}
                    />
                    {isOpen && (
                        <OptionsList ref={listRef} role="listbox" aria-label={label}>
                            {makeOptions(filteredOptions, selectedOption, setValue)}
                        </OptionsList>
                    )}
                </InputWrapper>
            </div>
        </SelectContainer>
    );
}

function getSentimentValue(sentiment) {
    switch (sentiment?.toLowerCase()) {
        case "low volatility expected":
            return 1;
        case "moderate volatility expected":
            return 2;
        case "high volatility expected":
            return 3;
        default:
            return 0; // For any unexpected sentiment values
    }
}

function makeOptions(options, selectedOption, setValue) {
    return options.map((o) => (
        <Option
            sentiment={o.sentiment}
            onClick={() => selectedOption?.value !== o.value && setValue(o)}
            key={o.value}
            data-value={o.value}
            isSelected={o.value === selectedOption?.value}
        >
            {o.name}
        </Option>
    ));
}

const Option = styled.li`
    padding: 10px;
    cursor: pointer;
    background-color: ${(props) => (props.isSelected ? "#e0e0e0" : "transparent")};
    position: relative;

    &:hover,
    &:focus {
        background-color: #f0f0f0;
        outline: none;
    };
    &::after {
        content: '${(props) => {
            switch (getSentimentValue(props.sentiment)) {
                case 3:
                    return "⭐⭐⭐";
                case 2:
                    return "⭐⭐";
                case 1:
                    return "⭐";
                default:
                    return "";
            }
        }}';
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);

`;
