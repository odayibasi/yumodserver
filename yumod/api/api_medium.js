const request = require("request");

var S3FS = require('s3fs');
var s3Options = { region: 'us-west-1' };
var bucketPath = 'yumod.com.data';
var s3fsImpl = new S3FS(bucketPath, s3Options);

const aws = require('aws-sdk');
const s3 = new aws.S3();

exports.checkAccountFindAllMediumPostCreateStoryModelAndSaveS3 = (req, res) => {
    var postModel = { storyModel: { stories: [] }, req: req, res: res };
    checkMediumAccountUpdateFlag(postModel);
}



/*==================================================================
    Step0 Update medium_accountname
===================================================================*/

function checkMediumAccountUpdateFlag(postModel) {

    var refreshFlagMap = ""
    if (postModel.req.body.refreshFlagMap == undefined) { //RefreshFlag undefined
        loadStoryModelS3ToLocal(postModel);
    } else {
        refreshFlagMap = postModel.req.body.refreshFlagMap;
        if (refreshFlagMap.checkMediumAccountUpdateFlag) {
            checkMediumAccountAndFillModel(postModel);
        } else { //Medium Account Update False ....
            loadStoryModelS3ToLocal(postModel);
        }
    }

}

/*==================================================================
    Step1 Check Any Model Exist In S3
===================================================================*/

function loadStoryModelS3ToLocal(postModel) {

    //Load From S3
    var username = postModel.req.user['https://api.yumod.com/email'];
    console.log("Load From S3 username:" + username);
    var storyModelPath = 'accounts/' + username + '/storymodel.json';
    var params = { Bucket: bucketPath, Key: storyModelPath };

    s3.getObject(params, function(err, data) {
        // Handle any error and exit
        if (err) {
            console.log(err + " StoryModel not created yet");
            checkMediumAccountAndFillModel(postModel);
            return err;

        }

        // No error happened
        // Convert Body from a Buffer to a String
        var objectData = data.Body.toString('utf-8'); // Use the encoding necessary
        postModel.storyModel = JSON.parse(objectData);
        if (postModel.storyModel != undefined && postModel.storyModel.version != undefined && postModel.storyModel.version === "1.0.0") {
            postModel.newStories = [];
            refreshStoryModel(postModel);
        } else {
            checkMediumAccountAndFillModel(postModel);
        }
    });
}



/*==================================================================
    Step1.1 Scrap Story MetaData from Medium Only New Stories
===================================================================*/

function refreshStoryModel(postModel) {

    var pagingTo = postModel.pagingTo != undefined ? "&to=" + postModel.pagingTo : "";
    var urlTemp = "https://medium.com/_/api/users/$userId/profile/stream?source=latest&limit=100$pagingTo";
    var url = urlTemp.replace("$userId", postModel.storyModel.userId).replace("$pagingTo", pagingTo);
    console.log(url);
    request(url, function(error, response, html) {
        // First we'll check to make sure no errors occurred when making the request
        if (!error) {
            var content = html.substring(16);
            var jContent = JSON.parse(content);
            var posts = jContent.payload.references.Post;
            if (jContent.payload.paging.next == undefined) { //Last Paging
                saveStoryModel(postModel); //Save Model to S3
            } else {
                postModel.pagingTo = jContent.payload.paging.next.to;
                console.log(postModel.pagingTo);
                for (var pKey in posts) {
                    var pItem = posts[pKey];
                    var sUrl = "https://medium.com/p/" + pItem.uniqueSlug;

                    if (sUrl == postModel.storyModel.stories[0].sUrl) {

                        console.log("New Stories Count:" + postModel.newStories.length);
                        var allStory = postModel.newStories.concat(postModel.storyModel.stories);
                        postModel.storyModel.stories = allStory;
                        saveStoryModel(postModel);
                        return;
                    }

                    //Publish Date
                    var d = new Date(parseInt(pItem.latestPublishedAt)); // The 0 there is the key, which sets the date to the epoch
                    var sPublishedDate = d.toISOString().replace('-', '/').split('T')[0].replace('-', '/');
                    var sTotalClaps = pItem.virtuals.totalClapCount;
                    postModel.newStories.push({ sTitle: pItem.title, sUrl: sUrl, sPublishedDate: sPublishedDate, uuid: sUrl, sTotalClaps: sTotalClaps });
                }
                findAllMediumPostAndFillModel(postModel);
            }
        }
    })
}



/*==================================================================
    Step2 Scrap User MetaData from Medium
===================================================================*/

function checkMediumAccountAndFillModel(postModel) {

    var medium_accountname = ""
    if (postModel.req.body.medium_accountname == undefined) {
        postModel.res.json({ result: false, msg: 'No medium_accountname' });
        postModel.res.status(200).end();
    } else {
        medium_accountname = postModel.req.body.medium_accountname;
    }


    var urlTemp = "https://medium.com/@$medium_account?format=json"
    var url = urlTemp.replace("$medium_account", medium_accountname);
    request(url, function(error, response, html) {
        // First we'll check to make sure no errors occurred when making the request
        if (!error) {
            var content = html.substring(16);
            var jContent = JSON.parse(content);
            if (jContent.success) {
                postModel.storyModel.userId = jContent.payload.user.userId;
                postModel.storyModel.medium_accountname = medium_accountname;
                postModel.storyModel.version = "1.0.0";
                findAllMediumPostAndFillModel(postModel);
            } else {
                postModel.res.json({ result: false, msg: 'Invalid User Account' });
                postModel.res.status(200).end();
            }
        }
    })

}


/*==================================================================
    Step3 Scrap Story MetaData from Medium
===================================================================*/

function findAllMediumPostAndFillModel(postModel) {

    var pagingTo = postModel.pagingTo != undefined ? "&to=" + postModel.pagingTo : "";
    var urlTemp = "https://medium.com/_/api/users/$userId/profile/stream?source=latest&limit=100$pagingTo";
    var url = urlTemp.replace("$userId", postModel.storyModel.userId).replace("$pagingTo", pagingTo);
    console.log(url);
    request(url, function(error, response, html) {
        // First we'll check to make sure no errors occurred when making the request
        if (!error) {
            var content = html.substring(16);
            var jContent = JSON.parse(content);
            var posts = jContent.payload.references.Post;
            if (jContent.payload.paging.next == undefined) { //Last Paging
                saveStoryModel(postModel); //Save Model to S3
            } else {
                postModel.pagingTo = jContent.payload.paging.next.to;
                console.log(postModel.pagingTo);
                for (var pKey in posts) {
                    var pItem = posts[pKey];
                    var sUrl = "https://medium.com/p/" + pItem.uniqueSlug;
                    var sTotalClaps = pItem.virtuals.totalClapCount;

                    //Publish Date
                    var d = new Date(parseInt(pItem.latestPublishedAt)); // The 0 there is the key, which sets the date to the epoch
                    sPublishedDate = d.toISOString().replace('-', '/').split('T')[0].replace('-', '/');

                    var existStoryIndex = -1;
                    var stories=postModel.storyModel.stories;
                    for (var i = 0; i < stories.length; i++) {
                        if (stories[i].sUrl === sUrl) {
                            existStoryIndex = i;
                            break;
                        }
                    }

                    if (existStoryIndex === -1) { //Not Exist In StoryModel
                        stories.push({ sTitle: pItem.title, sUrl: sUrl, sPublishedDate: sPublishedDate, uuid: sUrl, sTotalClaps: sTotalClaps });
                    } else {
                        var story = stories[existStoryIndex];
                        story.sTitle = pItem.title;
                        story.sUrl = sUrl;
                        story.sPublishedDate = sPublishedDate;
                        //uuid not updated..
                        story.sTotalClaps = sTotalClaps;
                    }
                }
                findAllMediumPostAndFillModel(postModel);
            }
        }
    })
}





/*==================================================================
     Step4 S3 Save StoryModel
===================================================================*/

function saveStoryModel(postModel) {
    var username = postModel.req.user['https://api.yumod.com/email'];
    console.log("username:" + username);

    savePath = 'accounts/' + username + '/storymodel.json';
    console.log("savingPath:" + savePath);

    var s3Text = JSON.stringify(postModel.storyModel, null, 4);
    s3fsImpl.writeFile(savePath, s3Text).then(function() {
        console.log('It\'s saved!');
    }, function(reason) {
        throw reason;
    });
    postModel.res.json({ result: true, data: postModel.storyModel, msg: 'Story Model Saved' });
    postModel.res.status(200).end();

}