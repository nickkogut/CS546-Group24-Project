import { ObjectId } from "mongodb";
import {users, userJobs, openJobs, payrollJobs} from "../config/mongoCollections.js";
import fs from "fs";

const savedIds = { // Stores the id of everything added to the database
    users: [],
    userJobs: [],
    openJobs: [],
    payrollJobs : []
};


const getDataFromJson = (filePath) =>
    {
        // args are passed from within this file, and assumed to be valid.
        return JSON.parse(fs.readFileSync(filePath).toString());
    } 

const main = async () => {
    
    // PAYROLL JOBS
    const payrollJobsCollection = await payrollJobs();
    await payrollJobsCollection.deleteMany({});
    const payrollJobsData = getDataFromJson("tasks/payroll.json");
    const newPayrollJobs = [];
    for (const payrollJob of payrollJobsData) {
        let _id = new ObjectId()

        const { title, agency, startYear, endYear, startSalary, endSalary, employee, borough } = payrollJob;
        const newPayrollJob = {
            _id,
            startYear,
            endYear,
            startSalary,
            endSalary,
            employee,
            borough
        }
        newPayrollJobs.push(newPayrollJob);
        savedIds.payrollJobs.push(_id);
    }
    try {
        let insertInfo = await payrollJobsCollection.insertMany(newPayrollJobs, {});
        if (!insertInfo) {
            throw "Error inserting payroll jobs"
        }
    } catch (e) {
        console.log(e);
    }

    // OPEN JOBS
    const openJobsCollection = await openJobs();
    await openJobsCollection.deleteMany({});
    const openJobsData = getDataFromJson("tasks/postings.json");
    const newOpenJobs = [];
    for (const openJob of openJobsData) {
        let _id = new ObjectId();
        const { jobId, agency, title, category, fullTime, experience, borough, desc, reqs, skills, residency, postingDate, salary, url } = openJob;
        const newOpenJob = {
            jobId,
            agency,
            title,
            category,
            fullTime,
            experience,
            borough,
            desc,
            reqs,
            skills,
            residency,
            postingDate,
            salary,
            url
        }
        newOpenJobs.push(newOpenJob);
        savedIds.openJobs.push(_id);
    }
    try {
        let insertInfo = await openJobsCollection.insertMany(newOpenJobs);
        if (!insertInfo) {
            throw "Error inserting open jobs"
        }
    } catch (e) {
        console.log(e);
    }

    // USERS
    const usersCollection = await users();
    await usersCollection.deleteMany({});
    const usersToAdd = []
    
    let _id = new ObjectId();
    savedIds.users.push(_id);
    const user1 = {
        _id,
        "firstName": "Steve",
        "lastName ":  "Jobs",
        "email":  "sjobs@apple.com",
        "borough":  "Brooklyn",
        "age": 53,
        "hashedPassword": "$2a$08$XdvNkfdNIL8F8xsuIUeSbNOFgK0M0iV5HOskfVn7.PWncShU.O",
        "public": true,
        "heldJobs ": [ 
            {
            "_id":  new ObjectId(),
            "title":  "President",
            "agency":  "Technology and Innovation",
            "startYear ": 2021,
            "endYear": 2025,
            "startSalary": 999_000.01,
            "endSalary": 999_999.99,
            "borough":  "Manhattan"
            },
            
            {
            "_id":  new ObjectId(),
            "title":  "Vice President",
            "agency":  "Sewage",
            "startYear ": 2018,
            "endYear": 2021,
            "startSalary": 25_000.01,
            "endSalary": 29_000.10,
            "borough":  "Queens"
            }
        ],
        
        "possibleJobs ": [
            {
            "job ":  savedIds.openJobs[0],
            "applicationStatus":  "Applied",
            "notes ":  "Near grandma’s house, good pay.",
            "confidence":  "High",
            },
            {
            "job ":  savedIds.openJobs[1],
            "applicationStatus":  "Interview Scheduled",
            "notes ":  "I don't meet half the requirements but they have a free cafeteria so I'm trying.",
            "confidence":  "Low",
            }
        ]
    }

    _id = new ObjectId();
    savedIds.users.push(_id);
    const user2 = {
        _id,
        "firstName": "Joe",
        "lastName ":  "Smith",
        "email":  "js@aol.com",
        "borough":  "Staten Island",
        "age": 20,
        "hashedPassword": "$s8da09s7d0as7d0a98sd0iV5HOskfVn7.PWncS$90$1",
        "public": false,
        "heldJobs ": [ 
            {
            "_id":  new ObjectId(),
            "title":  "Assistant Janitor",
            "agency":  "Department of Education",
            "startYear ": 2023,
            "endYear": 2024,
            "startSalary": 20_000,
            "endSalary": 22_000,
            "borough":  "Staten Island"
            }
        ],
        
        "possibleJobs ": []
    }
    


    usersToAdd.push(user1);
    usersToAdd.push(user2);
    try {
        let insertInfo = await usersCollection.insertMany(usersToAdd);
        if (!insertInfo) throw "Error: failed to add user";
    } catch (e) {
        console.log(e);
    }
    

};

main().then(() => {
    console.log('Done seeding database');
}).catch((e) => {
    console.error(e);
}).finally(() => {
    console.log('Closing connection to database');
    process.exit(0);
});