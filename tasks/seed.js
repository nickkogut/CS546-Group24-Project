import { ObjectId } from "mongodb";
import { users, openJobs, payrollJobs } from "../config/mongoCollections.js";
import fs from "fs";

const savedIds = { // Stores the id of everything added to the database. Used for making sample data
    users: [],
    openJobs: [],
    payrollJobs: []
};

const getDataFromJson = (filePath) => {
    return JSON.parse(fs.readFileSync(filePath).toString());
}

const sanitizeCodePoints = (text) => {
    return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

const main = async () => {
    // PAYROLL JOBS
    console.log("Adding payroll jobs (may take ~10 seconds)")
    const payrollJobsCollection = await payrollJobs();
    await payrollJobsCollection.deleteMany({});
    const payrollJobsData = getDataFromJson("tasks/payroll.json");
    const newPayrollJobs = [];
    for (const payrollJob of payrollJobsData) {
        let _id = new ObjectId()

        let { title, agency, startYear, endYear, startSalary, endSalary, employee, borough } = payrollJob;
        title = sanitizeCodePoints(title);
        agency = sanitizeCodePoints(agency);

        const newPayrollJob = {
            title,
            agency,
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
        console.log(`Added ${newPayrollJobs.length} historical jobs.`)
    } catch (e) {
        console.log(e);
    }

    // OPEN JOBS
    console.log("Adding open jobs")
    const openJobsCollection = await openJobs();
    await openJobsCollection.deleteMany({});
    const openJobsData = getDataFromJson("tasks/postings.json");
    const newOpenJobs = [];
    for (const openJob of openJobsData) {
        let _id = new ObjectId();
        let { jobId, agency, title, category, fullTime, experience, borough, desc, reqs, skills, residency, postingDate, salary, url, keywords } = openJob;
        agency = sanitizeCodePoints(agency);
        title = sanitizeCodePoints(title);
        desc = sanitizeCodePoints(desc);
        reqs = sanitizeCodePoints(reqs);
        skills = sanitizeCodePoints(skills);

        const newOpenJob = {
            // jobId,
            _id,
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
            postingDate: new Date(postingDate),
            keywords: keywords,
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
        console.log(`Added ${newOpenJobs.length} open job listings.`)
    } catch (e) {
        console.log(e);
    }

    // USERS
    console.log("Adding sample users")
    const usersCollection = await users();
    await usersCollection.deleteMany({});
    const usersToAdd = []

    let _id = new ObjectId();
    savedIds.users.push(_id);
    const user1 = {
        _id,
        "firstName": "Steve",
        "lastName ": "Jobs",
        "email": "sjobs@apple.com",
        "borough": "Brooklyn",
        "age": 53,
        "resume": `OBJECTIVE Highly organized and motivated Business Administration graduate with strong analytical and communication skills. Seeking an Operations Assistant role to leverage proficiency in data management and process improvement to support the efficiency goals of [Company Name].

EDUCATION Bachelor of Arts in Business Administration | University of the West | Nowhere, OK | Graduated: May 2024

    GPA: 3.8/4.0 (Dean’s List: 2022–2024)

    Relevant Coursework: Operations Management, Business Analytics, Organizational Behavior, Project Management.

ACADEMIC PROJECTS Senior Capstone: Workflow Efficiency Analysis

    Led a team of 4 to analyze the supply chain of a local non-profit.

    Identified bottlenecks in inventory management and proposed a digital tracking solution projected to save 10 hours of labor weekly.

    Presented findings to the non-profit board, receiving a commendation for "actionable insights."

WORK EXPERIENCE

Administrative Intern | Logistics Corp | [City, State] Summer 2023

    Assisted the Operations Manager in scheduling shifts for 50+ employees using Excel and scheduling software.

    Digitized over 500 physical client files, improving record retrieval time by 30%.

    Prepared weekly meeting agendas and took detailed minutes for executive reviews.

Shift Supervisor | The Daily Grind Coffee Shop | [City, State] Sept 2021 – May 2024

    Trained 10+ new hires on customer service protocols and POS systems.

    Managed cash drawer reconciliation totaling $2,000+ daily with zero discrepancies.

    Resolved customer complaints calmly and effectively, maintaining a 4.9-star location rating.

SKILLS

    Technical: Microsoft Office Suite (Advanced Excel: Pivot Tables, VLOOKUP), Asana, Slack, Zoom.

    Languages: English (Native), Spanish (Conversational).

    Key Attributes: Time Management, Detail-Oriented, Adaptability, Problem Solving.`,
        "hashedPassword": "$2a$08$XdvNkfdNIL8F8xsuIUeSbNOFgK0M0iV5HOskfVn7.PWncShU.O",
        "public": true,
        "heldJobs": [
            {
                "_id": new ObjectId(),
                "title": "President",
                "agency": "Technology and Innovation",
                "startYear ": 2021,
                "endYear": 2025,
                "startSalary": 999_000.01,
                "endSalary": 999_999.99,
                "borough": "Manhattan"
            },

            {
                "_id": new ObjectId(),
                "title": "Vice President",
                "agency": "Sewage",
                "startYear ": 2018,
                "endYear": 2021,
                "startSalary": 25_000.01,
                "endSalary": 29_000.10,
                "borough": "Queens"
            }
        ],

        "taggedJobs": [
            {
                "jobId": savedIds.openJobs[0],
                "applicationStatus": "Applied",
                "notes": "Near grandma's house, good pay.",
                "confidence": 7,
            },
            {
                "jobId": savedIds.openJobs[1],
                "applicationStatus": "Interview Scheduled",
                "notes": "I don't meet half the requirements but they have a free cafeteria so I'm trying.",
                "confidence": 2,
            }
        ]
    }

    _id = new ObjectId();
    savedIds.users.push(_id);
    const user2 = {
        _id,
        "firstName": "Joe",
        "lastName ": "Smith",
        "email": "js@aol.com",
        "borough": "Staten Island",
        "age": 20,
        "resume": `PROFESSIONAL SUMMARY Results-oriented Digital Marketing Specialist with 6+ years of experience driving brand awareness and revenue growth. Expert in SEO/SEM, content strategy, and social media management. Proven track record of increasing organic traffic by 40% YoY and managing ad budgets exceeding $50k/month. Adept at using analytics to optimize campaigns and improve ROI.

PROFESSIONAL EXPERIENCE

Senior Marketing Associate | TechFlow Solutions | [City, State] Jan 2021 – Present

    Spearheaded a rebranding campaign that resulted in a 25% increase in lead generation within the first quarter.

    Manage a quarterly budget of $150,000 across Google Ads and LinkedIn, achieving a consistent 3.5x ROAS.

    Collaborate with sales teams to align content strategy with the buyer journey, reducing the sales cycle by 15%.

    Supervise two junior associates, providing mentorship on SEO best practices and data analysis.

Marketing Coordinator | GreenLeaf Agency | [City, State] June 2018 – Dec 2020

    Grew social media following from 2,000 to 15,000+ followers across Instagram and Twitter through organic engagement strategies.

    Wrote and optimized weekly blog posts, resulting in a 200% increase in organic web traffic over two years.

    Coordinated email marketing newsletters with an average open rate of 28% (industry avg. 18%).

CORE SKILLS

    Strategy: SEO/SEM, Content Marketing, Email Automation, A/B Testing

    Tools: Google Analytics, HubSpot, SEMrush, WordPress, Salesforce

    Soft Skills: Project Management, Cross-functional Collaboration, Data Analysis

EDUCATION Bachelor of Science in Marketing | Stevens Institute of Technology | Hoboken, NJ`,
        "hashedPassword": "$s8da09s7d0as7d0a98sd0iV5HOskfVn7.PWncS$90$1",
        "public": false,
        "heldJobs ": [
            {
                "_id": new ObjectId(),
                "title": "Assistant Janitor",
                "agency": "Department of Education",
                "startYear ": 2023,
                "endYear": 2024,
                "startSalary": 20_000,
                "endSalary": 22_000,
                "borough": "Staten Island"
            }
        ],

        "taggedJobs": []
    }



    usersToAdd.push(user1);
    usersToAdd.push(user2);
    try {
        let insertInfo = await usersCollection.insertMany(usersToAdd);
        if (!insertInfo) throw "Error: failed to add user";
        console.log(`Added ${usersToAdd.length} sample users`)
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