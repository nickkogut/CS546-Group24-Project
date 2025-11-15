import { checkBorough, checkDate, checkNumber, checkString, valOrDefault, clamp, checkId } from "../helpers.js";
import { openJobs, users } from "../config/mongoCollections.js";
import { keywordWhitelist } from "./openJobKeywords.js";
import { ObjectId } from "mongodb";

const parseKeywords = (input) => {
    const output = [];
    input = valOrDefault(input, "", checkString);
    if (input === "") return output;

    input = input.replace(/[^0-9a-zA-Z\-\s]/g, ""); // Remove every character that does not show up in the keyword list
    input = input.split(" ");

    keywordWhitelist.forEach((keyword) => {
        if (input.includes(keyword)) {
            output.push(keyword);
        }
    })

    return output;
}

export const filterJobs = async (page, numPerPage, agency, title, borough, keywords, resume, residency, fullTime, minDate, minSalary, maxSalary, userId, status, mustMatchKw = false) => {
    agency = valOrDefault(agency, "", checkString); // TODO: autocomplete search / show possible choices and verify that this is one of them
    title = valOrDefault(title, "", checkString); // TODO: same as agency
    keywords = valOrDefault(keywords, [], parseKeywords);
    resume = valOrDefault(resume, [], parseKeywords);

    keywords = [...new Set([...keywords, ...resume])];

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

    // TODO: if the user is passed here it must be authenticated previously as the current user 
    userId = valOrDefault(userId, "", checkId);
    status = valOrDefault(status, "", checkString);

    // Force status to match one of these or be blank
    if (!["applied", "rejected", "interview scheduled", "offer received", ""].includes(status.toLowerCase())) throw `Error: status ${status} is invalid`;

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

    // Add filters that are only active if certain data is supplied
    // i.e. only use whitelists if data is provided 

    if (userId != "" && status != "") {
        // look up the jobs the user has tagged with this status
        // TODO: We could easily allow the user to select multiple statuses at once
        const usersCollection = await users();
        const user = await usersCollection.findOne({
            _id: new ObjectId(userId),
        });
        if (user) {
            const jobIdsMatchingStatus = [];
            user.taggedJobs.forEach((job) => {
                if (job.applicationStatus.toLowerCase() === status.toLowerCase()) {
                    jobIdsMatchingStatus.push(job.jobId);
                }
            });

            searchParams[0]["$match"]["_id"] = { $in: jobIdsMatchingStatus };
        }
    }


    if (mustMatchKw) {
        searchParams[0]["$match"]["keywords"] = { $all: keywords };
    }
    try {
        const openJobsCollection = await openJobs();
        const jobs = await openJobsCollection.aggregate(searchParams).toArray();
        if (!jobs) throw "Error: found no jobs";

        // TODO: currently returning [] if no jobs are found. May want to throw here instead
        return jobs;
    } catch (e) {
        throw e;
    }
}

export const setAppStatus = async (userId, jobId, status) => {
    // TODO: if the user is passed here it must be authenticated previously as the current user 
    userId = checkId(userId);
    jobId = checkId(jobId)
    status = valOrDefault(status, "", checkString);

    // Force status to match one of these or be blank
    if (!["Applied", "Rejected", "Interview Scheduled", "Offer Received", ""].includes(status)) throw `Error: status ${status} is invalid`;

    // Make sure the user and job ids are valid
    const jobIdObj = new ObjectId(jobId);
    const userIdObj = new ObjectId(userId);

    const usersCollection = await users();
    const user = await usersCollection.findOne({
        _id: userIdObj
    });
    if (!user) throw `Error could not find user with id ${userId}`;

    const openJobsCollection = await openJobs();
    const job = await openJobsCollection.findOne({
        _id: jobIdObj,
    });
    if (!job) throw `Error could not find job with id ${jobId}`;


    let statusAlreadyExists = false;
    // check if the user has already tagged this job with a status
    for (let i = 0; i < user.taggedJobs.length; i++) {
        if (user.taggedJobs[i].jobId.equals(jobIdObj)) {
            if (user.taggedJobs[i].applicationStatus === status) {
                return true; // No update needed
            }
            statusAlreadyExists = true;
            break;
        }
    }

    if (!statusAlreadyExists) {
        // add this job entry to the user
        const insertion = await usersCollection.updateOne({
            _id: userIdObj
        },
            {
                $push: {
                    taggedJobs: {
                        jobId: jobIdObj,
                        applicationStatus: status,
                        notes: "",
                        confidence: 0, // TODO: what is the default?
                    }
                }
            });

        if (!insertion) throw "Error: failed to remove job status";
        return insertion;

    }

    if (status == "") {
        // Remove the tagged job from the user
        const removal = await usersCollection.updateOne({
            _id: userIdObj
        },
            {
                $pull: { taggedJobs: { jobId: jobIdObj } }
            });

        if (!removal) throw "Error: failed to remove job status";
        return removal; // not currentl checking whether or not a change occurred
    }

    // update the user's entry for this job
    const update = await usersCollection.updateOne({
        _id: userIdObj,
        "taggedJobs.jobId": jobIdObj
    },
        {
            $set: { "taggedJobs.$.applicationStatus": status }
        });

    if (!update) throw "Error: failed to update job status";
    // TODO: may want to return updated job to the route that calls this so it can be updated on the page
    return update;
}


