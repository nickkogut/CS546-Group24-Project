# CS 546 - Group 24 Final Project - Career Scope NYC 
https://github.com/nickkogut/CS546-Group24-Project

## Running the website
### Seed instructions:

1. Unzip /tasks/seed_data.zip and put its contents into /tasks (If you unzipped into a new folder, make sure to move the 2 json dataset files from that folder directly to /tasks so they are at the same level as seed_data.zip)
2. With a mongo server running, do "npm run seed"

### App running instructions

1. Open a terminal in the project's root directory
2. npm i
3. npm start
4. Connect at localhost:3000/

## Testing and using the site

### Sample User
For testing, you may create a new account or use this sample account that already has a resume, job history, and set of jobs they have applied to:

Name: Joe Smith \
Email: test@aol.com \
Password: Password123!

### Adjustments to proposed core features:
- Core Feature 7: We moved the ability to filter by application status from the account page to the jobs page.
- TODO: login and account page related stuff

### Extra Features
We implemented 3 of our proposed extra features:

1. Historical analysis extension for the Graph page: If the user is logged in, they may press a button that searches for all jobs and salaries that they listed on their profile page, telling them where every salary they ever earned ranks relative to others with the same position.

2. Advanced search features for the Job Stats page: The user may request a list of all jobs in the database sorted by salary. They may apply the same filters as normal to this list in addition to new ones such as filtering by year or minimum average salary. They can also indicate a minimum number of instances of a job (i.e. ignore any jobs that have less than 5 entries).

3. Factoring in job experience on the Job Stats page: the user can view information specific to years of experience in a role. For example, they might look for the average salary of someone who has been in the same role as them for between 5 and 10 years. This might help them understand if they are being underpaid, or if people tend to move out of their position quickly.

### Additional notes
- Staten Island does not report payroll history data in our dataset for the Compare page. However, it does supply open job listings. It is intentional that the compare page does not allow filtering the borough to Staten Island.

## Developers 
- Jason Chen: qaz12345tt1@gmail.com / ychen15@stevens.edu
- Tyler Focht: tfocht@stevens.edu
- Nick Kogut: nkogut4444@gmail.com 
- Shane Ruggirello: darkgasher2794@gmail.com

