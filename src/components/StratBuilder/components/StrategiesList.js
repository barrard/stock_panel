import React from "react";
import styled from "styled-components";
export default function StrategiesList({ strategies, selectStrat }) {
	return (
		<>
			<p>STRATEGIES</p>
			{strategies.length === 0 && <span>No Strategies found... </span>}
			{strategies.length > 0 &&
				strategies.map((strat, index) => <ListItem select={selectStrat} index={index} strat={strat} />)}
		</>
	);
}

const ListItem = ({ strat, index, select }) => (
	<Item index={index} onClick={() => select(strat)} key={index}>
		{`${index + 1}: ${strat.name}`}
	</Item>
);

const Item = styled.div`
	background-color: ${({ index }) => (index % 2 ? "#444" : "#555")};
	cursor: pointer;
	transition: all 0.3s;
	&&:hover {
		background-color: red;
	}
`;
