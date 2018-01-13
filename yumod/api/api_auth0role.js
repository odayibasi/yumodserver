var S3FS = require('s3fs');
var s3Options = { region: 'us-west-1' };
var bucketPath = 'yumod.com.data';
var s3fsImpl = new S3FS(bucketPath, s3Options);
var appSettings;
const aws = require('aws-sdk');
const s3 = new aws.S3();


var request = require("request");
var accessToken;
var ADMIN_ROLE_ID;
var FREE_USER_ROLE_ID;

exports.addRoleToUser = (req, res) => {
    console.log("Add Role To User");
    var postModel = { req: req, res: res };
    updateUserRole(postModel, 'PATCH', ADMIN_ROLE_ID);
}

exports.delRoleFromUser = (req, res) => {
    var postModel = { req: req, res: res };
    console.log("Del Role From User");
    updateUserRole(postModel, 'DELETE', ADMIN_ROLE_ID);

}

exports.checkUserSettingsIfNotExistSetRoleAndCreateSettingsSaveS3 = (req, res) => {
    console.log("Check UserSetting If Not Exist Create And Set Role");
    var postModel = { req: req, res: res };
    loadUserSettingsS3ToLocal(postModel);

}



readAppSettingsFromS3();
//getAuth0AuthorizationExtensionAccessToken();

/*==================================================================
      Auth0 Authorization Extension Access Token
===================================================================*/

function readAppSettingsFromS3() {

    var appSettingsPath = 'settings/appsettings.json';
    var params = { Bucket: bucketPath, Key: appSettingsPath };

    s3.getObject(params, function(err, data) {
        // Handle any error and exit
        if (err) {
            console.log(err + " AppSettings Not Exist");
            return err;

        }

        // No error happened
        // Convert Body from a Buffer to a String
        var objectData = data.Body.toString('utf-8'); // Use the encoding necessary
        console.log(objectData);
        appSettings = JSON.parse(objectData);
        //Set Roles
        ADMIN_ROLE_ID = [appSettings.auth0AuthorizationExtension.roleData.admin_role_id];
        FREE_USER_ROLE_ID = [appSettings.auth0AuthorizationExtension.roleData.free_user_role_id];

        //Generate Authorization Extension Access Token
        getAuth0AuthorizationExtensionAccessToken();


    });

}



function getAuth0AuthorizationExtensionAccessToken() {

    var options = {
        method: 'POST',
        url: 'https://odayibasi.auth0.com/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(appSettings.auth0AuthorizationExtension.keyData)
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);
        var accessTokenResp = JSON.parse(body)
        accessToken = 'Bearer ' + accessTokenResp.access_token;
    });

}



/*==================================================================
      Auth0 Authorization Extension Access Token
===================================================================*/
function updateUserRole(postModel, method, role) {

    var req = postModel.req;
    var res = postModel.res;
    var userId = req.user['https://api.yumod.com/user_id'];
    var email = req.user['https://api.yumod.com/email'];

    console.log("userId:" + userId + " email:" + email);
    var request = require("request");
    var apiURLTemp = appSettings.auth0AuthorizationExtension.roleData.url_address;
    var apiURL = apiURLTemp.replace("$userId", userId);
    console.log("RoleURL:" + apiURL);
    console.log("AccessToken:" + accessToken);

    var options = {
        method: method,
        url: apiURL,
        headers: { Authorization: accessToken, "Content-Type": "application/json" },
        json: role
    };

    request(options, function(error, response, body) {

        console.log("error:" + error);
        console.log("response:" + response);
        console.log("body:" + body);


        if (error) {
            throw new Error(error);
            res.json({ result: false, msg: error });
            res.status(200).end();
        } else {
            var msg = "Kullanıcıya Rol Eklendi";
            if (method == "DELETE") msg = "Kullanıdan Rol Silindi";
            console.log(msg);
            saveUserSettingsLocalToS3(postModel);
        }

    });
}




/*==================================================================
    Step1 Check UserSettings Exist Model Exist In S3
===================================================================*/

function loadUserSettingsS3ToLocal(postModel) {

    //Load From S3
    var username = postModel.req.user['https://api.yumod.com/email'];
    console.log("Load From S3 username:" + username);
    var userSettingsPath = 'accounts/' + username + '/usersettings.json';
    var params = { Bucket: bucketPath, Key: userSettingsPath };

    s3.getObject(params, function(err, data) {
        // Handle any error and exit
        if (err) {
            console.log(err + " UserSettings not created yet");
            assignFreeUserRoleAndSaveUserSettings(postModel);
            return err;

        }

        // No error happened
        // Convert Body from a Buffer to a String
        var objectData = data.Body.toString('utf-8'); // Use the encoding necessary
        postModel.userSettings = JSON.parse(objectData);
        postModel.res.json({ result: true, data: postModel.userSettings, msg: 'UserSettings Returned' });
        postModel.res.status(200).end();
    });
}



function assignFreeUserRoleAndSaveUserSettings(postModel) {
    updateUserRole(postModel, 'PATCH', FREE_USER_ROLE_ID);
}


function saveUserSettingsLocalToS3(postModel) {


    var username = postModel.req.user['https://api.yumod.com/email'];
    var userId = postModel.req.user['https://api.yumod.com/user_id'];

    console.log("username:" + username);

    savePath = 'accounts/' + username + '/usersettings.json';
    console.log("savingPath:" + savePath);

    postModel.userSettings = { username: username, userId: userId, role: "FreeUser" };
    var s3Text = JSON.stringify(postModel.userSettings, null, 4);
    s3fsImpl.writeFile(savePath, s3Text).then(function() {
        console.log('It\'s saved!');
    }, function(reason) {
        throw reason;
    });
    postModel.res.json({ result: true, data: postModel.userSettings, msg: 'UserSettings Returned' });
    postModel.res.status(200).end();

}