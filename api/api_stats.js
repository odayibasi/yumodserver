var s3Options = { region: 'us-west-1' };
var bucketPath = 'yumod.com.data';
const aws = require('aws-sdk');
const s3 = new aws.S3();

exports.getStats = (req, res) => {
    getUsers(req, res);
}


function getUsers(req, res) {

    var data = "";
    console.log("Stats Called");


    var params = {
        Bucket: 'yumod.com.data' /* required */
    };


    s3.listObjectsV2(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            var userstatMap = [];
            //console.log(data.Contents);
            for (var i = 0; i < data.Contents.length; i++) {
                var key = data.Contents[i].Key;
                //console.log(key);
                if (key.includes("accounts/")) {
                    var username = (key.split("/"))[1];
                    var userStat = userstatMap[username];
                    if (userStat == undefined) {
                        userStat = {};
                        userstatMap[username] = userStat;
                        userStat.username = username;
                        userStat.status = 0;
                    }
                    if (key.includes("usersettings.json")) userStat.status += 1;
                    else if (key.includes("storymodel.json")) userStat.status += 2;
                    else if (key.includes("foldermodel.json")) userStat.status += 4;
                    else if (key.includes("storymodel_enrich.json")) userStat.status += 8;
                }
            }


            var userStats = [];
            for (username in userstatMap) {
                userStats.push(userstatMap[username]);
            }

            // sort by value
            userStats = userStats.sort(function(a, b) {
                return b.status - a.status;
            });



            res.json({ result: true, data: userStats, msg: 'Stats Calculated' });
            res.status(200).end();

        }
    });





}