const request = require("request");

var S3FS = require('s3fs');
var s3Options = { region: 'us-west-1' };
var bucketPath = 'yumod.com.data';
var shareBucketPath = 'yumod.com.share';
var s3fsImpl = new S3FS(bucketPath, s3Options);
var s3fsShareImpl = new S3FS(shareBucketPath, s3Options);
var sh = require("shorthash");



const aws = require('aws-sdk');
const s3 = new aws.S3();

exports.loadFolderModel = (req, res) => {
    var postModel = { folderModel: { folders: [] }, req: req, res: res };
    loadFolderModelS3ToLocal(postModel);
}

exports.saveFolderModel = (req, res) => {
    var postModel = { folderModel: { folders: [] }, req: req, res: res };
    saveFolderModelToS3(postModel);
}


exports.shareFolderModel = (req, res) => {
    var postModel = { folderModel: { folders: [] }, req: req, res: res };
    shareFolderModelToS3(postModel);
}


/*==================================================================
      S3 Save FolderModel
===================================================================*/

function saveFolderModelToS3(postModel) {
    var username = postModel.req.user['https://api.yumod.com/email'];
    var folderModel = postModel.req.body;
    console.log("username:" + username);

    savePath = 'accounts/' + username + '/foldermodel.json';
    console.log("savingPath:" + savePath);

    var s3Text = JSON.stringify(folderModel, null, 4);
    s3fsImpl.writeFile(savePath, s3Text).then(function() {
        console.log('It\'s saved!');
    }, function(reason) {
        throw reason;
    });
    postModel.res.json({ result: true, data: folderModel, msg: 'Folder Model Saved' });
    postModel.res.status(200).end();

}


/*==================================================================
      S3 Load FolderModel
===================================================================*/

function loadFolderModelS3ToLocal(postModel) {

    //Load From S3
    var username = postModel.req.user['https://api.yumod.com/email'];
    console.log("Load From S3 username:" + username);
    var folderModelPath = 'accounts/' + username + '/foldermodel.json';
    var params = { Bucket: bucketPath, Key: folderModelPath };

    s3.getObject(params, function(err, data) {
        // Handle any error and exit
        if (err) {
            console.log(err + " FolderModel not created yet");
            postModel.folderModel = {};
            return err;

        }

        // No error happened
        // Convert Body from a Buffer to a String
        var objectData = data.Body.toString('utf-8'); // Use the encoding necessary
        console.log(objectData);
        postModel.folderModel = JSON.parse(objectData);
        postModel.res.json({ result: true, data: postModel.folderModel, msg: 'Folder Model Loaded' });
        postModel.res.status(200).end();

    });
}



/*==================================================================
      S3 Share FolderModel
===================================================================*/

function shareFolderModelToS3(postModel) {
    var username = postModel.req.user['https://api.yumod.com/email'];
    username = sh.unique(username);
    var folderModel = postModel.req.body;
    console.log("username:" + username);

    savePath = 'accounts/' + username + '/foldermodel.json';
    console.log("savingPath:" + savePath);

    var s3Text = JSON.stringify(folderModel, null, 4);
    s3fsShareImpl.writeFile(savePath, s3Text).then(function() {
        console.log('It\'s saved!');
    }, function(reason) {
        throw reason;
    });
    postModel.res.json({ result: true, data: folderModel, msg: 'Folder Model Saved', dashboardID: username });
    postModel.res.status(200).end();

}