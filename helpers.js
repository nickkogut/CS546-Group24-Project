import { ObjectId } from "mongodb";

export const checkString = (val) => {
    // throws if the input is not a non-empty string
    // returns the trimmed string
    if (!val || typeof val !== "string") throw `Error: expected a string. Received ${val}`;
    val = val.trim();
    if (val.length === 0) throw "Error: string most be non-empty";
    return val;
}

export const checkId = (id) => {
    id = checkString(id);
    if (!ObjectId.isValid(id)) throw "Error: invalid object ID";
    return id; // trimmed
}


export const valOrDefault = (val, defaultVal, f, fArgs) => {
    // if val is empty or not supplied, return the default value
    // Otherwise if f is supplied return f(val), if its not then just return val
    // if an array fArgs is supplied, its elements will be passed as arguments to f 
    // Note: f might be something like checkString
    if (typeof val === "undefined" || (typeof val === "string" && val.trim() === "")) {
        return defaultVal;
    } else if (typeof f !== "undefined") {
        if (typeof fArgs !== "undefined") {
            return f(val, ...fArgs);
        } else {
            return f(val);
        }
    } else {
        return val;
    }
}

export const checkNumber = (val, min, max) => {
    // returns a number representation the value passed to it if possible.
    if (typeof val === "string") {
        val = Number(val);
    }
    if (typeof val !== "number" || val === NaN) throw `Error: expected a number, received ${val}`;

    if (typeof min !== "undefined" && val < min) throw `Error: number ${val} out of range`;
    if (typeof max !== "undefined" && val > max) throw `Error: number ${val} out of range`;
    return val;
}

export const checkYear = (val, minYear = 1900, maxYear = 2100) => {
    // Checks if the number is a 4 digit year in the range
    val = checkNumber(val);
    if (val !== Math.floor(val)) throw "Error: provided year is a float";
    if (val < minYear || val > maxYear) throw "Error: provided year is out of range";
    return val;
}

export const checkBorough = (val) => {
    // Checks that the borough is valid. Trims and sets it to titlecase
    const validBoroughs = ["Queens", "Manhattan", "Brooklyn", "Staten Island", "Bronx"];
    val = checkString(val);

    for (let i = 0; i < validBoroughs.length; i++) {
        if (validBoroughs[i].toLowerCase() === val.toLowerCase()) return validBoroughs[i];
    }

    throw `Error: ${val} is not a borough`;
}

export const checkDate = (val) => {
    // Use with dates in the open jobs dataset. Input dates must be strings of  the form MM/DD/YYYY
    // returns a date object
    val = checkString(val);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(val)) throw `Error: ${val} should be YYYY-MM-DD`;

    return new Date(val.substring(5, 7) + "/" + val.substring(8, 10) + "/" + val.substring(0, 4)); // Convert to MM/DD/YYYY
}

export const clamp = (val, min, max) => {
    if (val > max) return max;
    if (val < min) return min;
    return val;
}














