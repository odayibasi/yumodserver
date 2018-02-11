const express = require('express');
const app = express();
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');
const cors = require('cors');
const bodyParser = require('body-parser');
const request = require("request");

//API
const auth0RoleAPI = require('./api/api_auth0role');
const mediumAccountAPI = require('./api/api_medium');
const folderAPI = require('./api/api_folder');
const statsAPI = require("./api/api_stats");


require('dotenv').config();

app.use(cors());
// Enable the use of request body parsing middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));




const checkJwt = jwt({
    // Dynamically provide a signing key based on the kid in the header and the singing keys provided by the JWKS endpoint.
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: "https://odayibasi.auth0.com/.well-known/jwks.json"
    }),

    // Validate the audience and the issuer.
    audience: 'https://api.yumod.com/storyman',
    issuer: 'https://odayibasi.auth0.com/',
    algorithms: ['RS256']
});






//===============================================================================
// ROLES PUBLIC...
//================================================================================
// app.patch('/api/user/role', checkJwt, jwtAuthz([]), function(req, res) {
//     auth0RoleAPI.addRoleToUser(req, res);
// });

// app.delete('/api/user/role', checkJwt, jwtAuthz([]), function(req, res) {
//     auth0RoleAPI.delRoleFromUser(req, res);
// });


app.post('/api/usersettings/', checkJwt, jwtAuthz([]), function(req, res) {
    auth0RoleAPI.checkUserSettingsIfNotExistSetRoleAndCreateSettingsSaveS3(req, res);
});


//===============================================================================
// CRM DASHBOARD 
//================================================================================
app.get('/api/stats', checkJwt, jwtAuthz(['read:stats']), function(req, res) {
    statsAPI.getStats(req, res);
});




//===============================================================================
// MEDIUM CONNECT
//================================================================================
app.post('/api/mediumconnects/', checkJwt, jwtAuthz(['create:mediumconnects']), function(req, res) {
    mediumAccountAPI.checkAccountFindAllMediumPostCreateStoryModelAndSaveS3(req, res);
});


//===============================================================================
// FOLDER MODEL UPDATE
//================================================================================
app.post('/api/foldermodel/', checkJwt, jwtAuthz(['save:foldermodel']), function(req, res) {
    folderAPI.saveFolderModel(req, res);
});

app.get('/api/foldermodel/', checkJwt, jwtAuthz(['read:foldermodel']), function(req, res) {
    folderAPI.loadFolderModel(req, res);
});

app.post('/api/dashboard/', checkJwt, jwtAuthz(['share:foldermodel']), function(req, res) {
    folderAPI.shareFolderModel(req, res);
});




//===============================================================================
// SAMPLE API For Private And Public
//================================================================================
app.get('/api/public', function(req, res) {
    res.json({
        message: "Hello from a public endpoint! You don't need to be authenticated to see this."
    });
});


app.get('/api/private', checkJwt, jwtAuthz(['write:storyman']), function(req, res) {
    // Associate the timesheet entry with the current user
    var userId = req.user['https://api.yumod.com/email'];
    console.log(userId);
    res.json({
        message: 'Hello from a private endpoint! You need to be authenticated and have a scope of read:messages to see this.' + userId
    });
});




var port = process.env.PORT || 3010
app.listen(port);
console.log('Listening on http://localhost:' + port);