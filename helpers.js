export const checkString = (val) => {
    // throws if the input is not a non-empty string
    // returns the trimmed string
    if (!val || typeof val !== "string") throw `Error: expected a string. Received ${val}`;
    val = val.trim();
    if (strVal.length === 0) throw "Error: string most be non-empty";
    return val;
}

export const valOrDefault = (val, defaultVal) => {
    return (typeof val !== "undefined") ? val : defaultVal;
}

export const checkNumber = (val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
        val = parseFloat(val);
        if (val === NaN) throw `Error: expected an integer. Received ${val}`;
    }
    return val;
}

export const checkYear = (val, minYear = 1900, maxYear = 2100) => {
    // Checks if the number is a 4 digit year in the range
    val = checkNumber(val);
    if (val !== Math.floor(val)) throw "Error: provided year is a float";
    if (val < minYear || val > maxYear) throw "Error: provided year is out of range";
    return val;
}














