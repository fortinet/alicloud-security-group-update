'use strict';
const getRawBody = require('raw-body');
const Core = require('@alicloud/pop-core');

const {
    REGION_ID,
    SECURITY_GROUP_ID,
    ACCESS_KEY_ID,
    ACCESS_KEY_SECRET,
    ENDPOINT
} = process.env;

module.exports.handler = function(req, resp) {
    var instanceParams;

    var params = {
        path: req.path,
        queries: req.queries,
        headers: req.headers,
        method: req.method,
        requestURI: req.url,
        clientIP: req.clientIP
    };

    var client = new Core({
        accessKeyId: ACCESS_KEY_ID,
        accessKeySecret: ACCESS_KEY_SECRET,
        endpoint: ENDPOINT,
        apiVersion: '2014-05-26' // https://github.com/aliyun/openapi-core-nodejs-sdk
    });

    var ipAddress = getRawBody();

    /** Additional Filters Can be applied here */
    if (isPrivateIp(ipAddress) === true) {
        instanceParams = {
            RegionId: REGION_ID,
            PrivateipAddresses: [ipAddress.src_ip]
        };
    } else {
        instanceParams = {
            RegionId: REGION_ID,
            PublicipAddresses: [ipAddress.src_ip]
        };
    }

    var requestOption = {
        method: 'POST'
    };

    describeAndUpdateECSInstance(instanceParams, requestOption);

    getRawBody(req, function(err, body) {
        params.body = body.toString();
        ipAddress = JSON.parse(params.body);
        console.log(`SRC_IP ${ipAddress.src_ip}`);
        return ipAddress;
    });

    function isPrivateIp(ipAddress) {
        ipAddress = String(ipAddress);
        var splitIP = ipAddress.split('.');
        var parseFirstOctet = parseInt(splitIP[1], 10);
        if (splitIP[0] === '10' ||
            (splitIP[0] === '172' && (parseFirstOctet >= 16 && parseFirstOctet <= 31)) ||
            (splitIP[0] === '192' && splitIP[1] === '168')) {
            return true;
        } else {
            return false;
        }
    }

    function describeAndUpdateECSInstance(instanceParams, requestOption) {
        client.request('DescribeInstances', instanceParams, requestOption).then(result => {
            var instanceID = result.Instances.Instance[0].InstanceId;
            var joinParams = {
                SecurityGroupId: SECURITY_GROUP_ID,
                InstanceId: instanceID
            };
            client.request('JoinSecurityGroup', joinParams, requestOption).then(secResult => {
                console.log(secResult);
                resp.sendStatus(200);
            }, ex => {
                console.log(ex);
                resp.sendStatus(500);
            });

        }, ex => {
            console.log(`ex: ${ex}`);
            resp.sendStatus(500);
        });
    }
};
