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

export function toFixedIfNeed(num, isDate) {
    if (isDate) {
        return new Date(num).toLocaleString();
    }
    let s = String(num).split(".")[1];
    if (s && s.length > 3) {
        num = parseFloat(num.toFixed(3));
    }
    return numFormat(num);
}

let numFormat = (num) =>
    new Intl.NumberFormat("en-US", { maximumSignificantDigits: 9 }).format(num);

export function checkSymbol(symbol) {
    const notStock = symbol.startsWith("/") || symbol.includes("/");
    if (notStock) {
        console.log("yooooo");

        return { isStock: false };
    }

    return { isStock: true };
}
