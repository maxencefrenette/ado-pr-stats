import fetch from 'cross-fetch';
import * as base64 from 'base-64';
import * as dotenv from 'dotenv';
import { chain } from 'lodash';

dotenv.config();

const pat = process.env.PAT;
const username = process.env.USERNAME;
const organization = process.env.ORGANIZATION;
const project = process.env.PROJECT;
const repositories = process.env.REPOSITORIES!.split(',');
const startDate = process.env.START_DATE ? new Date(process.env.START_DATE) : new Date(0);
const endDate = process.env.END_DATE ? new Date(process.env.END_DATE) : new Date();

async function apiRequest(request: string) {
    const response = await fetch(`https://dev.azure.com/${organization}/${project}/_apis${request}`, {
        headers: {
            Authorization: 'Basic' + base64.encode(username + ':' + pat),
            Accept: 'application/json',
        },
    });
    return await response.json();
}

async function main() {
    console.log(`PR Reviews for ${organization}/${project}`);
    console.log(`From ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log("Repos:")
    console.log(` - ${repositories.join("\n - ")}`);
    console.log();

    let all_reviewers: any[] = [];

    for (const repo of repositories) {
        const response = await apiRequest(
            `/git/repositories/${repo}/pullrequests?searchCriteria.status=completed&api-version=7.1-preview.1`
        );
        const pull_requests = response.value;
        const filtered_pull_requests = chain(pull_requests)
            .filter((pr) => startDate < new Date(pr.closedDate) && new Date(pr.closedDate) < endDate)
            .value();
        const reviewers = chain(filtered_pull_requests).map('reviewers').flatten().filter(r => !r.isContainer).map('uniqueName').value();
        all_reviewers = all_reviewers.concat(reviewers);
    }

    const stats = chain(all_reviewers).countBy().toPairs().sortBy('1').reverse().value();
    const pretty_stats = chain(stats)
        .map(([username, reviews]) => `${username.padEnd(30)} ${reviews}`)
        .join('\n')
        .value();
    console.log(pretty_stats);
}
main().catch(console.error);
