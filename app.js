const singleLineLog = require('single-line-log').stdout;
const ObjectsToCsv = require('objects-to-csv');

let allMessages = {};

async function query() {
    for(let iterations = 0; ; iterations++) {
        const query = `
            query {
                message(
                limit: 100, 
                offset: ${iterations * 100}, 
                where: { domain: { is_test_net: { _eq: false } } }) 
                {
                    id
                    timestamp
                }
            }
        `;

        let res = await fetch('https://hyperlane-explorer.hasura.app/v1/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        res = await res.json();

        for(let message of res?.data?.message) {
            const d = message.timestamp.substring(0, 10);
            const timestamp = new Date(d).getTime() / 1000;
            if (allMessages[timestamp] == null) {
                allMessages[timestamp] = 1;
            }
            else {
                allMessages[timestamp] += 1;
            }
        }

        try {
            if(res?.data?.message.length < 100) { 
                break;
            }
        }
        catch {
            console.log(res);
            break;
        }

        singleLineLog('Discovering', iterations * 100, 'messages...');

        // Throttle so that GraphQL doesn't hate us
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    singleLineLog('Discovered', Object.values(allMessages).reduce((a, b) => a + b, 0), 'messages!');

    // Format to array
    const arrayFormatted = [];
    for(let entry of Object.entries(allMessages)) {
        const d = new Date(entry[0] * 1000);
        arrayFormatted.push({
            timestamp: entry[0],
            num_txs: entry[1],
            date: `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`
        });
    }
    
    // Write to CSV
    console.log("Writing to CSV...");
    const csv = new ObjectsToCsv(arrayFormatted);
    await csv.toDisk('./hyperlane-total.csv');
    console.log("Done!");
}

query();