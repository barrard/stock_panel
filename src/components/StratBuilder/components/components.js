import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
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

export const IconButton = ({ onClick, icon, index, title, color, bgColor }) => {
	return (
		<HoverIcon
			title={title}
			onClick={onClick}
			index={index}
			color={color}
			bgColor={bgColor}
		>
			<FontAwesomeIcon icon={icon} />
		</HoverIcon>
	);
};

const springAnimation = keyframes`
 0% {  transform :scale(1)    }
 50% {  transform :scale(1.1)    }
 100% {  transform :scale(1)    }
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
