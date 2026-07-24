const request = require('request');

let influxErrorShown = false;

exports.init = function (bucket, debug) {
    setInterval(() => {
        logBucket(bucket, debug);
    }, 10000);
};

async function logBucket(bucket, debug) {
    // Lewati jika Host InfluxDB tidak diset/kosong
    if (!process.env.INFLUXDB_HOST) {
        if (!influxErrorShown) {
            console.log('InfluxDB host is not configured. Metrics logging is disabled.');
            influxErrorShown = true;
        }
        return;
    }

    const { concurrent, queueCount, bucketCount, waiting } = bucket.getState();
    const body = {
        password: process.env.INFLUXDB_PASS,
        metric: 'ratelimit',
        server: process.env.SHARDER_SERVER,
        concurrent,
        queueCount,
        bucketCount,
        waiting,
    };

    if (debug) {
        body.debug = true;
    }

    request(
        {
            method: 'POST',
            uri: `${process.env.INFLUXDB_HOST}/qos`,
            json: true,
            body: body,
        },
        function (err) {
            if (err && !influxErrorShown) {
                console.error('InfluxDB is inactive. Log upload will not work.');
                influxErrorShown = true;
            }
        }
    );
}