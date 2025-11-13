import { checkBorough, checkDate, checkNumber, checkString, valOrDefault, clamp } from "../helpers.js";
import { openJobs } from "../config/mongoCollections.js";

export const filterJobs = async (page, numPerPage, agency, title, borough, keywords, residency, fullTime, minDate, minSalary, maxSalary, mustMatchKw = false) => {
    agency = valOrDefault(agency, "", checkString); // TODO: autocomplete search / show possible choices and verify that this is one of them
    title = valOrDefault(title, "", checkString); // TODO: same as agency
    keywords = valOrDefault(keywords, []);
    if (!Array.isArray(keywords)) throw "Error: keywords must be an array";
    keywords = keywords.map((keyword) => {
        return checkString(keyword).toLowerCase();
    });
    fullTime = valOrDefault(fullTime, false);                               // label as: "fulltime offered"? - we could switch the default and label as "part-time offered"
    borough = valOrDefault(borough, "", checkBorough);
    residency = valOrDefault(residency, true);                              // label as: "open to non-residents"
    minDate = valOrDefault(minDate, new Date("01/01/2000"), checkDate);
    minSalary = valOrDefault(minSalary, 0, checkNumber);
    maxSalary = valOrDefault(maxSalary, 10e9, checkNumber);

    numPerPage = valOrDefault(numPerPage, 10, checkNumber);
    numPerPage = clamp(numPerPage, 8, 50);

    page = valOrDefault(page, 1, checkNumber);
    page = clamp(page, 1, 10e4);
    // TODO: count returned results and calculate a max page. The route will need to prevent the user from going past it

    const searchParams = [
        {

            $match: {
                agency: { $regex: new RegExp(`${agency}`, "i") }, // match case insensitive, and anywhere in the string
                title: { $regex: new RegExp(`${title}`, "i") },
                borough: { $regex: new RegExp(`${borough}`, "i") },
                residency: { $in: [false, residency] }, // if residency is TRUE this matches all
                fullTime: { $in: [true, fullTime] },    // if fulltime is FALSE this matches all
                $and: [{ salary: { $gte: minSalary } }, { salary: { $lte: maxSalary } }],
                postingDate: { $gte: minDate },
            }
        },
        {
            $set: { kwMatches: { $size: { $setIntersection: [keywords, "$keywords"] } } },
        },

        {
            $sort: { kwMatches: -1 },
        },
        {
            $limit: numPerPage + numPerPage * (page - 1),
        },
        {
            $skip: numPerPage * (page - 1)
        }
    ];

    if (mustMatchKw) {
        searchParams[0]["$match"]["keywords"] = { "$all": keywords }
    }
    try {
        const openJobsCollection = await openJobs();
        const jobs = await openJobsCollection.aggregate(searchParams).toArray();
        if (!jobs) throw "Error: found no jobs";

        // TODO: currently returning [] if no jobs are found. May want to throw here
        return jobs;
    } catch (e) {
        throw e;
    }
}


