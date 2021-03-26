import React from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
export const AddThingBtn = ({ onClick, name }) => <Button onClick={onClick}>{name}</Button>;

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
`;

export const LoadingButton = ({ loading, submit, name }) => {
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
			// style={{ width: "inherit" }}
			className="btn"
			disabled={loading}
			onClick={submit}
			name={name}
		/>
	);
};

export const IconButton = ({ onClick, icon, index, title }) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<HoverIcon
			title={title}
			onClick={onClick}
			index={index}
			onMouseOver={() => setIsHovered(true)}
			onMouseOut={() => setIsHovered(false)}
			isHovered={isHovered}
		>
			<FontAwesomeIcon icon={icon} />
		</HoverIcon>
	);
};

const HoverIcon = styled.div`
	padding: 0.5em;
	background-color: ${({ isHovered, index }) => {
		if (index % 2) {
			if (isHovered) return "#333";
			else return "#444";
		} else {
			if (isHovered) return "#444";
			else return "#333";
		}
	}};
	transition: all 0.3s;
	border-radius: 10px;
	cursor: pointer;
`;
