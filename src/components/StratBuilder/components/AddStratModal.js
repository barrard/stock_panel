import React from "react";
import StratContext from "../StratContext";
import { LoadingButton } from "./components";

export default function AddStratModal() {
	const {
		submitNewStrat,
		newStrategyName,
		setNewStrategyName,
		creatingStrat,
	} = React.useContext(StratContext);

	return (
		<>
			<div>
				<label htmlFor="New Strategy Name">New Strategy Name</label>
				<input
					onChange={(e) => setNewStrategyName(e.target.value)}
					value={newStrategyName}
					type="text"
				/>
				<LoadingButton
					loading={creatingStrat}
					name="Create"
					submit={submitNewStrat}
				/>
			</div>
		</>
	);
}
