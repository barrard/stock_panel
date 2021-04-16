export const capitalize = (s) => {
	if (typeof s !== "string") return "";
	return s.charAt(0).toUpperCase() + s.slice(1);
};

export function getGroups(list) {
	let group = [];
	list.forEach((indicator) => {
		if (group.indexOf(indicator.group) < 0) group.push(indicator.group);
	});
	return group;
}
